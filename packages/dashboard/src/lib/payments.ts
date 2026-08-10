import {
  evaluateEnhancedPayment,
  type EnhancedPaymentDecision,
  type EnhancedSpendingGrant,
  type PaymentQuote,
} from "@pay-fence/policy-engine";
import type { SQLInputValue } from "node:sqlite";
import { fromMinorUnits, toMinorUnits } from "@pay-fence/ledger-persistent";
import { cryptoId, getDb, getLedger, nowIso, randomHex, type Row } from "./db";
import { getGrant } from "./grants";
import { defaultRiskScorers, makeReceipt } from "./engine";
import { DEFAULT_ORG } from "./constants";
import type { DecisionDetail, PaymentAttempt } from "@/types/dashboard";

export interface AttemptRecordInput {
  orgId: string;
  grantId: string;
  agentId: string;
  agentName: string;
  merchant: string;
  amount: string;
  currency: string;
  purpose: string;
  allowed: boolean;
  reason: string;
  riskScore: number | null;
  transactionHash: string | null;
  rail: string;
  network: string;
  /** JSON of {@link DecisionDetail} for explainability. */
  detail?: string | null;
  createdAt: string;
}

export function recordAttempt(input: AttemptRecordInput): PaymentAttempt {
  const id = cryptoId("pay");
  getDb()
    .prepare(
      `INSERT INTO payment_attempts
        (id, org_id, grant_id, agent_id, merchant, amount_minor_units, currency,
         purpose, allowed, reason, risk_score, transaction_hash, rail, network, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.orgId,
      input.grantId,
      input.agentId,
      input.merchant,
      toMinorUnits({ amount: input.amount, currency: input.currency }).toString(),
      input.currency,
      input.purpose,
      input.allowed ? 1 : 0,
      input.reason,
      input.riskScore,
      input.transactionHash,
      input.rail,
      input.network,
      input.detail ?? null,
      input.createdAt,
    );
  return { id, ...input, detail: input.detail ? parseDetail(input.detail) : null };
}

export interface AttemptFilter {
  orgId?: string;
  grantId?: string;
  agentId?: string;
  merchant?: string;
  allowed?: "true" | "false";
  from?: string;
  to?: string;
  limit?: number;
}

export function queryAttempts(filter: AttemptFilter = {}): PaymentAttempt[] {
  const conditions: string[] = [];
  const params: SQLInputValue[] = [];
  if (filter.orgId) {
    conditions.push("pa.org_id = ?");
    params.push(filter.orgId);
  }
  if (filter.grantId) {
    conditions.push("pa.grant_id = ?");
    params.push(filter.grantId);
  }
  if (filter.agentId) {
    conditions.push("pa.agent_id = ?");
    params.push(filter.agentId);
  }
  if (filter.merchant) {
    conditions.push("pa.merchant = ?");
    params.push(filter.merchant);
  }
  if (filter.allowed) {
    conditions.push("pa.allowed = ?");
    params.push(filter.allowed === "true" ? 1 : 0);
  }
  if (filter.from) {
    conditions.push("pa.created_at >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push("pa.created_at <= ?");
    params.push(filter.to);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(Math.max(filter.limit ?? 200, 1), 1000);
  const sql = `SELECT pa.*, a.name AS agent_name
    FROM payment_attempts pa
    LEFT JOIN agents a ON a.id = pa.agent_id
    ${where}
    ORDER BY pa.created_at DESC
    LIMIT ?`;
  const rows = getDb().prepare(sql).all(...params, limit) as Row[];
  return rows.map(rowToAttempt);
}

export function rowToAttempt(row: Row): PaymentAttempt {
  const currency = String(row.currency ?? "USDC");
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    grantId: String(row.grant_id),
    agentId: String(row.agent_id),
    agentName: String(row.agent_name ?? row.agent_id),
    merchant: String(row.merchant),
    amount: fromMinorUnits(BigInt(String(row.amount_minor_units)), currency).amount,
    currency,
    purpose: String(row.purpose ?? ""),
    allowed: Number(row.allowed) === 1,
    reason: String(row.reason),
    riskScore: row.risk_score == null ? null : Math.round(Number(row.risk_score) * 100) / 100,
    transactionHash: row.transaction_hash == null ? null : String(row.transaction_hash),
    rail: String(row.rail ?? "x402"),
    network: String(row.network ?? "base"),
    detail: parseDetail(row.detail),
    createdAt: String(row.created_at),
  };
}

function parseDetail(value: unknown): DecisionDetail | null {
  if (typeof value !== "string" || !value) return null;
  try {
    return JSON.parse(value) as DecisionDetail;
  } catch {
    return null;
  }
}

export interface QuoteInput {
  merchant: string;
  amount: string;
  currency?: string;
  purpose?: string;
  resource?: string;
  network?: string;
}

export function buildQuote(grant: { totalBudget: { currency: string } }, input: QuoteInput): PaymentQuote {
  const currency = input.currency ?? grant.totalBudget.currency;
  return {
    merchant: input.merchant,
    amount: { amount: input.amount, currency },
    purpose: input.purpose,
    resource: input.resource,
    rail: "x402",
    network: input.network ?? "base",
  };
}

/** Evaluate a quote through the policy engine without recording anything. */
export function evaluateQuote(
  grant: EnhancedSpendingGrant,
  quote: PaymentQuote,
  at: Date = new Date(),
): Promise<EnhancedPaymentDecision> {
  return evaluateEnhancedPayment(grant, quote, {
    ledger: getLedger(),
    riskScorers: defaultRiskScorers(),
    now: at,
  });
}

export interface RunPaymentInput extends QuoteInput {
  grantId: string;
  at?: string;
}

export interface RunPaymentResult {
  decision: EnhancedPaymentDecision;
  quote: PaymentQuote;
  attempt: PaymentAttempt;
  transactionHash: string | null;
}

/**
 * Run one payment through the real policy engine, then record the outcome
 * (and, when allowed, the corresponding ledger receipt) so subsequent
 * evaluations see the updated budget / frequency / rolling-window state.
 * This is the heart of the "live" simulator: it uses the exact same
 * `evaluateEnhancedPayment` an autonomous agent would hit.
 */
export async function runPayment(input: RunPaymentInput): Promise<RunPaymentResult> {
  const grant = getGrant(input.grantId);
  if (!grant) throw new Error("grant_not_found");
  if (grant.status !== "active") throw new Error("grant_not_active");

  const at = input.at ? new Date(input.at) : new Date();
  const quote = buildQuote(grant, input);

  const ledger = getLedger();
  const decision = await evaluateQuote(grant, quote, at);

  let transactionHash: string | null = null;
  if (decision.allowed) {
    transactionHash = `0xsettled_${randomHex(10)}`;
    ledger.record(
      makeReceipt({
        grant,
        quote,
        id: cryptoId("rct"),
        transactionHash,
        createdAt: at.toISOString(),
      }),
    );
  }

  const attempt = recordAttempt({
    orgId: grant.orgId,
    grantId: grant.id,
    agentId: grant.agentId,
    agentName: grant.agentName,
    merchant: quote.merchant,
    amount: quote.amount.amount,
    currency: quote.amount.currency,
    purpose: quote.purpose ?? "",
    allowed: decision.allowed,
    reason: decision.reason,
    riskScore: decision.riskScore ?? null,
    transactionHash,
    rail: "x402",
    network: quote.network ?? "base",
    detail: JSON.stringify(buildDetail(grant, decision, quote)),
    createdAt: at.toISOString(),
  });

  return { decision, quote, attempt, transactionHash };
}

function buildDetail(
  grant: { perPaymentLimit?: { amount: string; currency: string } },
  decision: EnhancedPaymentDecision,
  quote: PaymentQuote,
): DecisionDetail {
  const detail: DecisionDetail = {
    spent: decision.spent,
    remaining: decision.remaining,
    purpose: quote.purpose ?? "",
  };
  if (grant.perPaymentLimit) detail.perPaymentLimit = grant.perPaymentLimit;
  if (decision.frequencyUsage) detail.frequencyUsage = decision.frequencyUsage;
  if (decision.riskFactors) {
    detail.riskFactors = decision.riskFactors.map((f) => ({
      scorer: f.scorer,
      score: f.score,
      weight: f.weight,
    }));
  }
  return detail;
}