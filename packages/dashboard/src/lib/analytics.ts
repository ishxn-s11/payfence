import { fromMinorUnits } from "@pay-fence/ledger-persistent";
import { getDb, type Row } from "./db";
import { DEFAULT_ORG, DEFAULT_CURRENCY } from "./constants";
import type { OrgSummary } from "@/types/dashboard";

export interface SeriesPoint {
  label: string;
  value: string;
}

export interface CountItem {
  label: string;
  count: number;
}

export interface MerchantSpend {
  merchant: string;
  value: string;
}

export interface AgentActivity {
  agentId: string;
  name: string;
  attempts: number;
  allowed: number;
  denied: number;
  spent: string;
}

export function getOrgSummary(orgId: string = DEFAULT_ORG.id): OrgSummary {
  const agentCount = (getDb().prepare("SELECT COUNT(*) AS c FROM agents WHERE org_id = ?").get(orgId) as Row).c as number;
  const activeGrantCount = (getDb()
    .prepare("SELECT COUNT(*) AS c FROM grants WHERE org_id = ? AND status = 'active'")
    .get(orgId) as Row).c as number;

  const totals = getDb()
    .prepare(
      `SELECT
        COUNT(*) AS attempts,
        COALESCE(SUM(CASE WHEN allowed = 1 THEN 1 ELSE 0 END), 0) AS allowed_attempts,
        COALESCE(SUM(CASE WHEN allowed = 0 THEN 1 ELSE 0 END), 0) AS denied_attempts,
        COALESCE(SUM(CASE WHEN allowed = 1 AND transaction_hash IS NOT NULL THEN 1 ELSE 0 END), 0) AS settled_count,
        COALESCE(SUM(CASE WHEN allowed = 1 THEN amount_minor_units ELSE 0 END), 0) AS total_minor
      FROM payment_attempts WHERE org_id = ?`,
    )
    .get(orgId) as Row;

  return {
    agentCount,
    activeGrantCount,
    attempts: Number(totals.attempts),
    allowedAttempts: Number(totals.allowed_attempts),
    deniedAttempts: Number(totals.denied_attempts),
    settledCount: Number(totals.settled_count),
    totalSpent: fromMinorUnits(BigInt(String(totals.total_minor)), DEFAULT_CURRENCY).amount,
    currency: DEFAULT_CURRENCY,
  };
}

export function getSpendSeries(orgId: string = DEFAULT_ORG.id, days = 14): SeriesPoint[] {
  const rows = getDb()
    .prepare(
      `SELECT substr(created_at, 1, 10) AS day, SUM(amount_minor_units) AS total
       FROM payment_attempts
       WHERE org_id = ? AND allowed = 1
       GROUP BY day ORDER BY day DESC LIMIT ?`,
    )
    .all(orgId, days) as Row[];

  const byDay = new Map<string, bigint>();
  for (const row of rows) {
    byDay.set(String(row.day), BigInt(String(row.total)));
  }

  const points: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const total = byDay.get(day) ?? 0n;
    points.push({ label: day, value: fromMinorUnits(total, DEFAULT_CURRENCY).amount });
  }
  return points;
}

export function getDenialBreakdown(orgId: string = DEFAULT_ORG.id): CountItem[] {
  const rows = getDb()
    .prepare(
      `SELECT reason AS label, COUNT(*) AS count
       FROM payment_attempts
       WHERE org_id = ? AND allowed = 0
       GROUP BY reason ORDER BY count DESC`,
    )
    .all(orgId) as Row[];
  return rows.map((r) => ({ label: String(r.label), count: Number(r.count) }));
}

export function getRiskDistribution(orgId: string = DEFAULT_ORG.id): CountItem[] {
  const rows = getDb()
    .prepare(
      `SELECT risk_score FROM payment_attempts
       WHERE org_id = ? AND risk_score IS NOT NULL`,
    )
    .all(orgId) as Row[];

  const buckets: CountItem[] = [
    { label: "low (0–33)", count: 0 },
    { label: "medium (34–66)", count: 0 },
    { label: "high (67–100)", count: 0 },
  ];
  for (const row of rows) {
    const score = Number(row.risk_score);
    if (score <= 33) buckets[0].count += 1;
    else if (score <= 66) buckets[1].count += 1;
    else buckets[2].count += 1;
  }
  return buckets;
}

export function getTopMerchants(orgId: string = DEFAULT_ORG.id, limit = 6): MerchantSpend[] {
  const rows = getDb()
    .prepare(
      `SELECT merchant, SUM(amount_minor_units) AS total
       FROM payment_attempts
       WHERE org_id = ? AND allowed = 1
       GROUP BY merchant ORDER BY total DESC LIMIT ?`,
    )
    .all(orgId, limit) as Row[];
  return rows.map((r) => ({
    merchant: String(r.merchant),
    value: fromMinorUnits(BigInt(String(r.total)), DEFAULT_CURRENCY).amount,
  }));
}

export function getAgentActivity(orgId: string = DEFAULT_ORG.id): AgentActivity[] {
  const rows = getDb()
    .prepare(
      `SELECT pa.agent_id AS agent_id, a.name AS name,
              COUNT(*) AS attempts,
              COALESCE(SUM(CASE WHEN pa.allowed = 1 THEN 1 ELSE 0 END), 0) AS allowed,
              COALESCE(SUM(CASE WHEN pa.allowed = 0 THEN 1 ELSE 0 END), 0) AS denied,
              COALESCE(SUM(CASE WHEN pa.allowed = 1 THEN pa.amount_minor_units ELSE 0 END), 0) AS spent
       FROM payment_attempts pa
       LEFT JOIN agents a ON a.id = pa.agent_id
       WHERE pa.org_id = ?
       GROUP BY pa.agent_id, a.name
       ORDER BY spent DESC`,
    )
    .all(orgId) as Row[];
  return rows.map((r) => ({
    agentId: String(r.agent_id),
    name: String(r.name ?? r.agent_id),
    attempts: Number(r.attempts),
    allowed: Number(r.allowed),
    denied: Number(r.denied),
    spent: fromMinorUnits(BigInt(String(r.spent)), DEFAULT_CURRENCY).amount,
  }));
}