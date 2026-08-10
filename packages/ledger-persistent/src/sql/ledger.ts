import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { Money, PaymentReceipt } from "@payai-sh/core";
import { fromMinorUnits, toMinorUnits } from "../money.js";
import type { EnhancedSpendingLedger, WindowFilters } from "../interfaces.js";
import { SCHEMA } from "./schema.js";

export interface SQLEnhancedLedgerOptions {
  /** An already-open DatabaseSync instance to share. */
  db?: DatabaseSync;
  /** SQLite file path; defaults to an in-memory database. */
  filename?: string;
}

type Row = Record<string, SQLInputValue>;

/**
 * SQLite-backed implementation of {@link EnhancedSpendingLedger}.
 *
 * Uses Node's built-in `node:sqlite` module, so no native compilation is
 * required. Amounts are persisted as integer minor units to avoid floating
 * point error.
 */
export class SQLEnhancedLedger implements EnhancedSpendingLedger {
  private readonly db: DatabaseSync;

  constructor(options: SQLEnhancedLedgerOptions = {}) {
    this.db = options.db ?? new DatabaseSync(options.filename ?? ":memory:");
    this.db.exec(SCHEMA);
  }

  /** Close the underlying database. Call when the ledger is no longer needed. */
  close(): void {
    this.db.close();
  }

  record(receipt: PaymentReceipt): void {
    this.db
      .prepare(
        `INSERT INTO payment_receipts
           (id, grant_id, agent_id, merchant, amount_minor_units, currency,
            purpose, rail, network, resource, transaction_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        receipt.id,
        receipt.grantId,
        receipt.agentId,
        receipt.merchant,
        toMinorUnits(receipt.amount).toString(),
        receipt.amount.currency,
        receipt.purpose ?? null,
        receipt.rail ?? null,
        receipt.network ?? null,
        receipt.resource ?? null,
        receipt.transactionHash ?? null,
        receipt.createdAt,
      );
  }

  getSpent(grantId: string): Money | undefined {
    return this.aggregate("WHERE grant_id = ?", [grantId]);
  }

  list(grantId?: string): PaymentReceipt[] {
    const rows = grantId
      ? this.db
          .prepare("SELECT * FROM payment_receipts WHERE grant_id = ? ORDER BY created_at DESC")
          .all(grantId)
      : this.db.prepare("SELECT * FROM payment_receipts ORDER BY created_at DESC").all();
    return rows.map(rowToReceipt);
  }

  async getTransactionCount(
    grantId: string,
    windowStart: Date,
    windowEnd: Date,
    filters?: WindowFilters,
  ): Promise<number> {
    let sql = `SELECT COUNT(*) AS count FROM payment_receipts
               WHERE grant_id = ? AND created_at >= ? AND created_at < ?`;
    const params: SQLInputValue[] = [grantId, iso(windowStart), iso(windowEnd)];
    if (filters?.merchant) {
      sql += " AND merchant = ?";
      params.push(filters.merchant);
    }
    if (filters?.purpose) {
      sql += " AND purpose = ?";
      params.push(filters.purpose);
    }
    const row = this.db.prepare(sql).get(...params) as Row | undefined;
    return Number(row?.count ?? 0);
  }

  async getSpentInWindow(
    grantId: string,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<Money | undefined> {
    return this.aggregate(
      "WHERE grant_id = ? AND created_at >= ? AND created_at < ?",
      [grantId, iso(windowStart), iso(windowEnd)],
    );
  }

  async listRecent(grantId: string, limit: number): Promise<PaymentReceipt[]> {
    const rows = this.db
      .prepare(
        "SELECT * FROM payment_receipts WHERE grant_id = ? ORDER BY created_at DESC LIMIT ?",
      )
      .all(grantId, limit);
    return rows.map(rowToReceipt);
  }

  private aggregate(where: string, params: SQLInputValue[]): Money | undefined {
    const row = this.db
      .prepare(
        `SELECT currency, SUM(amount_minor_units) AS total
         FROM payment_receipts ${where}
         GROUP BY currency`,
      )
      .get(...params) as Row | undefined;
    if (!row) return undefined;
    return fromMinorUnits(BigInt(String(row.total)), String(row.currency));
  }
}

function iso(date: Date): string {
  return date.toISOString();
}

function rowToReceipt(row: Row): PaymentReceipt {
  const currency = String(row.currency);
  return {
    id: String(row.id),
    grantId: String(row.grant_id),
    agentId: String(row.agent_id),
    merchant: String(row.merchant),
    amount: fromMinorUnits(BigInt(String(row.amount_minor_units)), currency),
    purpose: nullableString(row.purpose),
    rail: nullableString(row.rail),
    network: nullableString(row.network),
    resource: nullableString(row.resource),
    transactionHash: nullableString(row.transaction_hash),
    createdAt: String(row.created_at),
  };
}

function nullableString(value: SQLInputValue | undefined): string | undefined {
  return value == null ? undefined : String(value);
}
