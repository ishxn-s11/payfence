import type { PaymentQuote } from "@payai-sh/core";
import type { EnhancedSpendingLedger } from "@pay-fence/ledger-persistent";
import { toMinorUnits } from "@pay-fence/ledger-persistent";
import type { EnhancedSpendingGrant, FrequencyUsage } from "./types.js";

export interface FrequencyCheckResult {
  allowed: boolean;
  reason?: string;
  usage?: FrequencyUsage;
}

export interface WindowCheckResult {
  allowed: boolean;
  reason?: string;
  spent?: string;
  limit?: string;
}

/**
 * Enforce all configured frequency (rate) limits against a sliding window.
 * A limit counts payments whose `createdAt` falls within `[now - windowMs, now)`.
 */
export async function checkFrequencyLimits(
  grant: EnhancedSpendingGrant,
  quote: PaymentQuote,
  ledger: EnhancedSpendingLedger,
  now: Date,
): Promise<FrequencyCheckResult> {
  for (const limit of grant.frequencyLimits ?? []) {
    const windowStart = new Date(now.getTime() - limit.windowMs);

    let filters: { merchant?: string; purpose?: string } | undefined;
    if (limit.perMerchant) filters = { merchant: quote.merchant };
    else if (limit.perPurpose) filters = { purpose: quote.purpose };

    const count = await ledger.getTransactionCount(
      grant.id,
      windowStart,
      now,
      filters,
    );

    if (count >= limit.maxTransactions) {
      return {
        allowed: false,
        reason: "frequency_limit_exceeded",
        usage: {
          windowMs: limit.windowMs,
          currentCount: count,
          maxCount: limit.maxTransactions,
          remainingCount: 0,
        },
      };
    }
  }

  return { allowed: true };
}

/**
 * Enforce all configured rolling-window budgets. Each window is a sliding
 * interval ending now; spend is summed from the ledger within that interval.
 */
export async function checkRollingWindows(
  grant: EnhancedSpendingGrant,
  quote: PaymentQuote,
  ledger: EnhancedSpendingLedger,
  now: Date,
): Promise<WindowCheckResult> {
  for (const window of grant.rollingWindows ?? []) {
    const windowStart = new Date(now.getTime() - window.windowMs);
    const spent = await ledger.getSpentInWindow(grant.id, windowStart, now);

    const spentMinor = spent ? toMinorUnits(spent) : 0n;
    const quoteMinor = toMinorUnits(quote.amount);
    const maxMinor = toMinorUnits(window.maxSpend);

    if (spentMinor + quoteMinor > maxMinor) {
      return {
        allowed: false,
        reason: "rolling_window_budget_exceeded",
        spent: spent?.amount,
        limit: window.maxSpend.amount,
      };
    }

    if (window.maxTransactions !== undefined) {
      const count = await ledger.getTransactionCount(grant.id, windowStart, now);
      if (count >= window.maxTransactions) {
        return { allowed: false, reason: "rolling_window_frequency_exceeded" };
      }
    }
  }

  return { allowed: true };
}
