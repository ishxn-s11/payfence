import { getDb, getLedger, nowIso } from "./db";
import { DEFAULT_ORG } from "./constants";
import { createGrant } from "./grants";
import { runPayment } from "./payments";

export interface SeedResult {
  agents: number;
  grants: number;
  attempts: number;
}

interface Spec {
  grantId: string;
  merchant: string;
  amount: string;
  purpose?: string;
  /** days before now */
  d: number;
  /** minutes before now (intra-day spread) */
  m: number;
  /** extra seconds before now (for sub-minute bursts) */
  s?: number;
}

const RES = "grn_research";
const PIPE = "grn_pipeline";
const COMM = "grn_commerce";

const ALLOWLIST: Record<string, string[]> = {
  [RES]: ["data.example.com", "inference.example.com", "storage.example.com"],
  [PIPE]: ["data.example.com", "storage.example.com"],
  [COMM]: ["market.example.com", "paywall.example.com"],
};

const PURPOSES: Record<string, string[]> = {
  [RES]: ["research", "fetch"],
  [PIPE]: ["etl", "sync", "fetch"],
  [COMM]: ["purchase", "subscription", "trial"],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function atMs(spec: Spec): number {
  return Date.now() - spec.d * 86_400_000 - spec.m * 60_000 - (spec.s ?? 0) * 1000;
}

function buildSpecs(): Spec[] {
  const specs: Spec[] = [];
  const amounts = ["0.05", "0.10", "0.25", "0.50", "0.75", "1.20"];

  // Scattered legitimate history over the past week, per grant. Purposes are
  // drawn from each grant's allowlist so these are mostly allowed.
  for (let d = 7; d >= 1; d -= 1) {
    for (const [grantId, merchants] of Object.entries(ALLOWLIST)) {
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i += 1) {
        specs.push({
          grantId,
          merchant: pick(merchants),
          amount: pick(amounts),
          purpose: pick(PURPOSES[grantId]),
          d,
          m: Math.floor(Math.random() * 1400),
        });
      }
    }
  }

  // Denial scenarios — one per rule class, with purpose allowed so the cause
  // is exactly the intended rule.
  specs.push(
    // merchant_not_allowed
    { grantId: RES, merchant: "untrusted.example.com", amount: "0.10", purpose: "research", d: 1, m: 60 },
    { grantId: PIPE, merchant: "untrusted.example.com", amount: "0.25", purpose: "fetch", d: 2, m: 400 },
    // per_payment_limit_exceeded
    { grantId: RES, merchant: "data.example.com", amount: "5.00", purpose: "research", d: 1, m: 120 },
    { grantId: PIPE, merchant: "storage.example.com", amount: "8.00", purpose: "fetch", d: 2, m: 300 },
    // risk_score_exceeded: at the per-payment limit on the commerce grant →
    // amount risk ≈100 × 0.6 = 60, plus merchant 10 × 0.4 = 4 → 64 > max 60.
    { grantId: COMM, merchant: "market.example.com", amount: "12.00", purpose: "purchase", d: 1, m: 180 },
  );

  // frequency_limit_exceeded: 5 rapid calls inside one minute (research allows
  // 4/min → the 5th is cut off). Spaced a few seconds apart; processed oldest
  // first so ledger state builds up within the window.
  for (const s of [16, 12, 8, 4, 0]) {
    specs.push({ grantId: RES, merchant: "inference.example.com", amount: "0.05", purpose: "research", d: 0, m: 5, s });
  }

  return specs;
}

export async function seedDemoData(): Promise<SeedResult> {
  const orgId = DEFAULT_ORG.id;
  const db = getDb();

  // Ensure the policy ledger (payment_receipts) exists before we touch it.
  getLedger();

  // Reset this org's data (keeps it idempotent for a "reset demo" action).
  db.prepare("DELETE FROM payment_attempts WHERE org_id = ?").run(orgId);
  db.prepare("DELETE FROM payment_receipts").run();
  db.prepare("DELETE FROM grants WHERE org_id = ?").run(orgId);
  db.prepare("DELETE FROM agents WHERE org_id = ?").run(orgId);

  // Agents.
  const agentRows: { id: string; name: string; description: string }[] = [
    { id: "agt_research", name: "research-01", description: "Autonomous literature and data research assistant" },
    { id: "agt_pipeline", name: "data-pipeline", description: "ETL and sync pipeline for internal analytics" },
    { id: "agt_commerce", name: "commerce-copilot", description: "Discovers and procures SaaS subscriptions" },
  ];
  const insertAgent = db.prepare(
    "INSERT INTO agents (id, org_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  for (const a of agentRows) {
    insertAgent.run(a.id, orgId, a.name, a.description, nowIso());
  }

  // Grants.
  createGrant({
    id: RES,
    orgId,
    agentId: "agt_research",
    totalBudget: { amount: "20", currency: "USDC" },
    perPaymentLimit: { amount: "2", currency: "USDC" },
    allowedMerchants: ALLOWLIST[RES],
    allowedPurposes: PURPOSES[RES],
    frequencyLimits: [
      { windowMs: 60_000, maxTransactions: 4 },
      { windowMs: 3_600_000, maxTransactions: 60 },
    ],
    rollingWindows: [{ windowMs: 86_400_000, maxSpend: { amount: "8", currency: "USDC" } }],
    riskPolicy: {
      maxRiskScore: 55,
      scorers: [
        { type: "amount", weight: 0.5 },
        { type: "velocity", weight: 0.3 },
        { type: "merchant", weight: 0.2 },
      ],
    },
  });

  createGrant({
    id: PIPE,
    orgId,
    agentId: "agt_pipeline",
    totalBudget: { amount: "50", currency: "USDC" },
    perPaymentLimit: { amount: "5", currency: "USDC" },
    allowedMerchants: ALLOWLIST[PIPE],
    allowedPurposes: PURPOSES[PIPE],
    frequencyLimits: [
      { windowMs: 60_000, maxTransactions: 6 },
      { windowMs: 3_600_000, maxTransactions: 120 },
    ],
    rollingWindows: [{ windowMs: 86_400_000, maxSpend: { amount: "20", currency: "USDC" } }],
  });

  createGrant({
    id: COMM,
    orgId,
    agentId: "agt_commerce",
    totalBudget: { amount: "100", currency: "USDC" },
    perPaymentLimit: { amount: "12", currency: "USDC" },
    allowedMerchants: ALLOWLIST[COMM],
    allowedPurposes: PURPOSES[COMM],
    riskPolicy: {
      maxRiskScore: 60,
      scorers: [
        { type: "amount", weight: 0.6 },
        { type: "merchant", weight: 0.4 },
      ],
    },
  });

  // Generate the history in chronological order so ledger state is consistent.
  const specs = buildSpecs().sort((a, b) => atMs(a) - atMs(b));
  let attempts = 0;
  for (const spec of specs) {
    try {
      await runPayment({
        grantId: spec.grantId,
        merchant: spec.merchant,
        amount: spec.amount,
        purpose: spec.purpose,
        at: new Date(atMs(spec)).toISOString(),
      });
      attempts += 1;
    } catch {
      // skip invalid specs
    }
  }

  return { agents: agentRows.length, grants: 3, attempts };
}