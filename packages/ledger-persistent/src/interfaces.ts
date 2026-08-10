import type { Money, PaymentReceipt, SpendingLedger } from "@payai-sh/core";

export interface WindowFilters {
  /** Restrict the window query to a single merchant. */
  merchant?: string;
  /** Restrict the window query to a single purpose. */
  purpose?: string;
}

/**
 * A spending ledger that additionally supports time-windowed queries.
 *
 * The base `SpendingLedger` methods (getSpent/record/list) remain synchronous for
 * compatibility with `@payai-sh/core`'s `evaluatePayment`; the windowed queries are
 * async so implementations can back them with Redis, HTTP, or other async stores.
 */
export interface EnhancedSpendingLedger extends SpendingLedger {
  /** Count payments recorded in [windowStart, windowEnd) for a grant. */
  getTransactionCount(
    grantId: string,
    windowStart: Date,
    windowEnd: Date,
    filters?: WindowFilters,
  ): Promise<number>;

  /** Sum spending recorded in [windowStart, windowEnd) for a grant. */
  getSpentInWindow(
    grantId: string,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<Money | undefined>;

  /** Most recent receipts for a grant, newest first. */
  listRecent(grantId: string, limit: number): Promise<PaymentReceipt[]>;
}
