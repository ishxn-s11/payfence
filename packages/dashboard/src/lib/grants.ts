import type { EnhancedSpendingLedger } from "@pay-fence/ledger-persistent";
import { fromMinorUnits, toMinorUnits } from "@pay-fence/ledger-persistent";
import type { SQLInputValue } from "node:sqlite";
import { getDb, cryptoId, nowIso, type Row } from "./db";
import { DEFAULT_ORG, DEFAULT_CURRENCY } from "./constants";
import type { DashboardGrant, GrantStatus, GrantUsage } from "@/types/dashboard";

const GRANT_SELECT = `SELECT g.*, a.name AS agent_name FROM grants g
  LEFT JOIN agents a ON a.id = g.agent_id`;

export function parseJsonArray(value: unknown): unknown[] | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function parseJsonObj<T>(value: unknown): T | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function rowToGrant(row: Row): DashboardGrant {
  const currency = String(row.total_budget_currency ?? DEFAULT_CURRENCY);
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    agentId: String(row.agent_id),
    agentName: String(row.agent_name ?? row.agent_id),
    status: String(row.status) as GrantStatus,
    totalBudget: { amount: String(row.total_budget_amount), currency },
    perPaymentLimit:
      row.per_payment_limit_amount != null
        ? {
            amount: String(row.per_payment_limit_amount),
            currency: String(row.per_payment_limit_currency ?? currency),
          }
        : undefined,
    allowedMerchants: parseJsonArray(row.allowed_merchants) as string[],
    allowedPurposes: parseJsonArray(row.allowed_purposes) as string[],
    frequencyLimits: parseJsonArray(row.frequency_limits) as DashboardGrant["frequencyLimits"],
    rollingWindows: parseJsonArray(row.rolling_windows) as DashboardGrant["rollingWindows"],
    riskPolicy: parseJsonObj<DashboardGrant["riskPolicy"]>(row.risk_policy),
    expiresAt: row.expires_at ? String(row.expires_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export interface GrantFilter {
  orgId?: string;
  agentId?: string;
  status?: string;
}

export function listGrants(filter: GrantFilter = {}): DashboardGrant[] {
  const conditions: string[] = [];
  const params: SQLInputValue[] = [];
  if (filter.orgId) {
    conditions.push("g.org_id = ?");
    params.push(filter.orgId);
  }
  if (filter.agentId) {
    conditions.push("g.agent_id = ?");
    params.push(filter.agentId);
  }
  if (filter.status) {
    conditions.push("g.status = ?");
    params.push(filter.status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(`${GRANT_SELECT} ${where} ORDER BY g.updated_at DESC`)
    .all(...params) as Row[];
  return rows.map(rowToGrant);
}

export function getGrant(id: string): DashboardGrant | undefined {
  const row = getDb()
    .prepare(`${GRANT_SELECT} WHERE g.id = ?`)
    .get(id) as Row | undefined;
  return row ? rowToGrant(row) : undefined;
}

export interface CreateGrantInput {
  id?: string;
  orgId?: string;
  agentId: string;
  status?: GrantStatus;
  totalBudget: { amount: string; currency?: string };
  perPaymentLimit?: { amount: string; currency?: string };
  allowedMerchants?: string[];
  allowedPurposes?: string[];
  frequencyLimits?: unknown[];
  rollingWindows?: unknown[];
  riskPolicy?: unknown;
  expiresAt?: string;
}

export function createGrant(input: CreateGrantInput): DashboardGrant {
  const orgId = input.orgId ?? DEFAULT_ORG.id;
  const id = input.id ?? cryptoId("grn");
  const created = nowIso();
  const currency = input.totalBudget.currency ?? DEFAULT_CURRENCY;
  getDb()
    .prepare(
      `INSERT INTO grants
        (id, org_id, agent_id, status, total_budget_amount, total_budget_currency,
         per_payment_limit_amount, per_payment_limit_currency, allowed_merchants,
         allowed_purposes, frequency_limits, rolling_windows, risk_policy, expires_at,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      orgId,
      input.agentId,
      input.status ?? "active",
      input.totalBudget.amount,
      currency,
      input.perPaymentLimit?.amount ?? null,
      input.perPaymentLimit?.currency ?? currency,
      jsonOrNull(input.allowedMerchants),
      jsonOrNull(input.allowedPurposes),
      jsonOrNull(input.frequencyLimits),
      jsonOrNull(input.rollingWindows),
      jsonOrNull(input.riskPolicy),
      input.expiresAt ?? null,
      created,
      created,
    );
  return (
    getGrant(id) ?? {
      id,
      orgId,
      agentId: input.agentId,
      agentName: input.agentId,
      status: input.status ?? "active",
      totalBudget: { amount: input.totalBudget.amount, currency },
      createdAt: created,
      updatedAt: created,
    }
  );
}

export type GrantPatch = Partial<
  Pick<
    DashboardGrant,
    | "status"
    | "totalBudget"
    | "perPaymentLimit"
    | "allowedMerchants"
    | "allowedPurposes"
    | "frequencyLimits"
    | "rollingWindows"
    | "riskPolicy"
    | "expiresAt"
  >
>;

export function updateGrant(id: string, patch: GrantPatch): DashboardGrant {
  const sets: string[] = [];
  const params: SQLInputValue[] = [];
  const pushMoney = (alias: string, money?: { amount?: string; currency?: string }) => {
    if (money == null) return;
    if (money.amount !== undefined) {
      sets.push(`${alias}_amount = ?`);
      params.push(money.amount);
    }
    if (money.currency !== undefined) {
      sets.push(`${alias}_currency = ?`);
      params.push(money.currency);
    }
  };

  if (patch.status) {
    sets.push("status = ?");
    params.push(patch.status);
  }
  pushMoney("total_budget", patch.totalBudget);
  if (patch.perPaymentLimit === undefined) {
    // unchanged or cleared — treat undefined as "leave as is" for money objects
  } else if (patch.perPaymentLimit === null) {
    sets.push("per_payment_limit_amount = NULL", "per_payment_limit_currency = NULL");
  } else {
    pushMoney("per_payment_limit", patch.perPaymentLimit);
  }
  if (patch.allowedMerchants !== undefined) {
    sets.push("allowed_merchants = ?");
    params.push(jsonOrNull(patch.allowedMerchants));
  }
  if (patch.allowedPurposes !== undefined) {
    sets.push("allowed_purposes = ?");
    params.push(jsonOrNull(patch.allowedPurposes));
  }
  if (patch.frequencyLimits !== undefined) {
    sets.push("frequency_limits = ?");
    params.push(jsonOrNull(patch.frequencyLimits));
  }
  if (patch.rollingWindows !== undefined) {
    sets.push("rolling_windows = ?");
    params.push(jsonOrNull(patch.rollingWindows));
  }
  if (patch.riskPolicy !== undefined) {
    sets.push("risk_policy = ?");
    params.push(jsonOrNull(patch.riskPolicy));
  }
  if (patch.expiresAt !== undefined) {
    sets.push("expires_at = ?");
    params.push(patch.expiresAt ?? null);
  }

  sets.push("updated_at = ?");
  params.push(nowIso());
  params.push(id);

  getDb().prepare(`UPDATE grants SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return getGrant(id)!;
}

export function setGrantStatus(id: string, status: GrantStatus): DashboardGrant {
  return updateGrant(id, { status });
}

export function deleteGrant(id: string): void {
  getDb().prepare("DELETE FROM grants WHERE id = ?").run(id);
}

/** Compute live budget/limit usage for a grant from the policy engine ledger. */
export async function getGrantUsage(
  grant: DashboardGrant,
  ledger: EnhancedSpendingLedger,
  now: Date = new Date(),
): Promise<GrantUsage> {
  const currency = grant.totalBudget.currency;
  const spent = ledger.getSpent(grant.id) ?? { amount: "0", currency };
  const spentMinor = toMinorUnits(spent);
  const totalMinor = toMinorUnits(grant.totalBudget);
  const remainingMinor = spentMinor >= totalMinor ? 0n : totalMinor - spentMinor;
  const percentUsed =
    totalMinor > 0n ? Math.min(100, Number((spentMinor * 100n) / totalMinor)) : 0;

  const frequency = await Promise.all(
    (grant.frequencyLimits ?? []).map(async (limit) => {
      const start = new Date(now.getTime() - limit.windowMs);
      const current = await ledger.getTransactionCount(grant.id, start, now);
      return { windowMs: limit.windowMs, current, max: limit.maxTransactions };
    }),
  );

  const rolling = await Promise.all(
    (grant.rollingWindows ?? []).map(async (w) => {
      const start = new Date(now.getTime() - w.windowMs);
      const spentInWindow = await ledger.getSpentInWindow(grant.id, start, now);
      const txCurrent =
        w.maxTransactions !== undefined
          ? await ledger.getTransactionCount(grant.id, start, now)
          : undefined;
      return {
        windowMs: w.windowMs,
        spent: spentInWindow?.amount ?? "0",
        max: w.maxSpend.amount,
        txCurrent,
        txMax: w.maxTransactions,
      };
    }),
  );

  return {
    grant,
    spent: spent.amount,
    remaining: fromMinorUnits(remainingMinor, currency).amount,
    currency,
    percentUsed,
    frequency,
    rolling,
    status: grant.status,
  };
}

function jsonOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}