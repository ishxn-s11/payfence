export type {
  EnhancedPaymentDecision,
  EnhancedSpendingGrant,
  FrequencyLimit,
  FrequencyUsage,
  RiskFactor,
  RiskPolicy,
  RiskScorerConfig,
  RollingWindow,
} from "./types.js";

export {
  evaluateEnhancedPayment,
  type PolicyEvaluatorOptions,
} from "./evaluator.js";

export {
  checkFrequencyLimits,
  checkRollingWindows,
  type FrequencyCheckResult,
  type WindowCheckResult,
} from "./frequency.js";

export {
  calculateRiskScore,
  clamp,
  type RiskContext,
  type RiskResult,
  type RiskScorer,
} from "./risk/scorer.js";
export { AmountRiskScorer } from "./risk/amount.js";
export { VelocityRiskScorer } from "./risk/velocity.js";
export { MerchantRiskScorer, type MerchantRegistry } from "./risk/merchant.js";

export {
  createEnhancedPayAIFetch,
  PaymentPolicyError,
  type CreateEnhancedFetchOptions,
  type PayAIFetchInit,
  type RiskAlert,
  type X402Payer,
  type X402PaymentRequest,
} from "./x402-wrapper.js";

// Re-export the base money/decision vocabulary so consumers can depend on a
// single package for the common types.
export type { Money, PaymentDecision, PaymentQuote, PaymentReceipt, SpendingGrant } from "@payai-sh/core";
