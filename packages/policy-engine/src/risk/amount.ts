import { toMinorUnits } from "@pay-fence/ledger-persistent";
import { clamp, type RiskContext, type RiskScorer } from "./scorer.js";

/**
 * Scores a payment by its size relative to the per-payment limit (or, when no
 * per-payment limit is set, the total budget). A payment at 100% of the limit
 * scores 100; small payments score near zero.
 */
export class AmountRiskScorer implements RiskScorer {
  readonly type = "amount";

  async score(context: RiskContext): Promise<number> {
    const { grant, quote } = context;
    const reference = grant.perPaymentLimit ?? grant.totalBudget;
    const quoteMinor = toMinorUnits(quote.amount);
    const referenceMinor = toMinorUnits(reference);

    if (referenceMinor <= 0n) return 100;
    return clamp((Number(quoteMinor) / Number(referenceMinor)) * 100);
  }
}
