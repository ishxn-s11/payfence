import { evaluatePayment, type PaymentQuote } from "@payai-sh/core";
import type { EnhancedSpendingLedger } from "@pay-fence/ledger-persistent";
import { checkFrequencyLimits, checkRollingWindows } from "./frequency.js";
import { calculateRiskScore, type RiskScorer } from "./risk/scorer.js";
import type {
  EnhancedPaymentDecision,
  EnhancedSpendingGrant,
  RiskFactor,
} from "./types.js";

export interface PolicyEvaluatorOptions {
  ledger: EnhancedSpendingLedger;
  /** Risk scorers registered by type name. Ignored when the grant has no risk policy. */
  riskScorers?: RiskScorer[];
  /** Override "now" for deterministic tests. */
  now?: Date;
}

/**
 * Evaluate a payment against every rule on a grant, in strict fail-closed order:
 *
 * 1. payai's base checks (currency, grant/quote expiry, merchant allowlist,
 *    purpose allowlist, per-payment limit, total budget) — reused verbatim.
 * 2. Frequency (rate) limits over sliding windows.
 * 3. Rolling-window budgets.
 * 4. Risk scoring; blocked when the aggregate exceeds `maxRiskScore`.
 *
 * No payment reaches settlement unless every enabled rule passes.
 */
export async function evaluateEnhancedPayment(
  grant: EnhancedSpendingGrant,
  quote: PaymentQuote,
  options: PolicyEvaluatorOptions,
): Promise<EnhancedPaymentDecision> {
  const now = options.now ?? new Date();

  const basic = evaluatePayment(grant, quote, options.ledger);
  if (!basic.allowed) {
    return basic;
  }

  if (grant.frequencyLimits) {
    const freq = await checkFrequencyLimits(grant, quote, options.ledger, now);
    if (!freq.allowed) {
      return {
        ...basic,
        allowed: false,
        reason: freq.reason!,
        frequencyUsage: freq.usage,
      };
    }
  }

  if (grant.rollingWindows) {
    const windowCheck = await checkRollingWindows(grant, quote, options.ledger, now);
    if (!windowCheck.allowed) {
      return { ...basic, allowed: false, reason: windowCheck.reason! };
    }
  }

  let riskScore: number | undefined;
  let riskFactors: RiskFactor[] | undefined;

  if (grant.riskPolicy && options.riskScorers) {
    const risk = await calculateRiskScore(
      grant,
      quote,
      options.ledger,
      options.riskScorers,
      grant.riskPolicy.scorers,
      now,
    );
    riskScore = risk.totalScore;
    riskFactors = risk.factors;

    if (riskScore > grant.riskPolicy.maxRiskScore) {
      return {
        ...basic,
        allowed: false,
        reason: "risk_score_exceeded",
        riskScore,
        riskFactors,
      };
    }
  }

  return {
    ...basic,
    allowed: true,
    riskScore,
    riskFactors,
  };
}
