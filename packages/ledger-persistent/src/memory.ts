import type { Money, PaymentReceipt } from "@payai-sh/core";
import { fromMinorUnits, toMinorUnits } from "./money.js";
import type { EnhancedSpendingLedger, WindowFilters } from "./interfaces.js";

/**
 * In-memory implementation of {@link EnhancedSpendingLedger}.
 * Suitable for tests, demos, and single-process prototypes.
 */
export class MemoryEnhancedLedger implements EnhancedSpendingLedger {
  private readonly receipts: PaymentReceipt[] = [];

  getSpent(grantId: string): Money | undefined {
    return sumReceipts(this.receipts.filter((r) => r.grantId === grantId));
  }

  record(receipt: PaymentReceipt): void {
    this.receipts.push(receipt);
  }

  list(grantId?: string): PaymentReceipt[] {
    return grantId ? this.receipts.filter((r) => r.grantId === grantId) : [...this.receipts];
  }

  async getTransactionCount(
    grantId: string,
    windowStart: Date,
    windowEnd: Date,
    filters?: WindowFilters,
  ): Promise<number> {
    return this.receipts.filter((r) =>
      inWindow(r, grantId, windowStart, windowEnd, filters),
    ).length;
  }

  async getSpentInWindow(
    grantId: string,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<Money | undefined> {
    return sumReceipts(
      this.receipts.filter((r) => inWindow(r, grantId, windowStart, windowEnd)),
    );
  }

  async listRecent(grantId: string, limit: number): Promise<PaymentReceipt[]> {
    return this.receipts
      .filter((r) => r.grantId === grantId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, limit);
  }
}

function inWindow(
  receipt: PaymentReceipt,
  grantId: string,
  start: Date,
  end: Date,
  filters?: WindowFilters,
): boolean {
  if (receipt.grantId !== grantId) return false;
  const ts = Date.parse(receipt.createdAt);
  if (Number.isNaN(ts)) return false;
  if (ts < start.getTime() || ts >= end.getTime()) return false;
  if (filters?.merchant && receipt.merchant !== filters.merchant) return false;
  if (filters?.purpose && receipt.purpose !== filters.purpose) return false;
  return true;
}

function sumReceipts(receipts: PaymentReceipt[]): Money | undefined {
  if (receipts.length === 0) return undefined;
  const currency = receipts[0]?.amount.currency ?? "USDC";
  const total = receipts.reduce((acc, r) => acc + toMinorUnits(r.amount), 0n);
  return fromMinorUnits(total, currency);
}
