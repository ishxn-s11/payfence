import type { Money, PaymentDecision, SpendingGrant } from "@payai-sh/core";

/** A budget that resets on a rolling (sliding) time window. */
export interface RollingWindow {
  /** Window duration in milliseconds (e.g. 3600000 for an hour, 86400000 for a day). */
  windowMs: number;
  /** Maximum spend allowed inside the window. */
  maxSpend: Money;
  /** Optional cap on the number of payments inside the window. */
  maxTransactions?: number;
}

/** A transaction-frequency (rate) limit enforced over a sliding window. */
export interface FrequencyLimit {
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Maximum number of payments allowed inside the window. */
  maxTransactions: number;
  /** Apply the limit per merchant rather than across the whole grant. */
  perMerchant?: boolean;
  /** Apply the limit per purpose rather than across the whole grant. */
  perPurpose?: boolean;
}

/** A named risk scorer plus its weight in the aggregate score. */
export interface RiskScorerConfig {
  /** Matches a registered {@link RiskScorer} `type`. */
  type: string;
  /** Relative weight (0..1) in the weighted aggregate. Weights need not sum to 1. */
  weight: number;
  /** Optional scorer-specific configuration. */
  config?: Record<string, unknown>;
}

/** Risk policy attached to a grant. */
export interface RiskPolicy {
  /** Aggregate risk score (0..100) above which a payment is blocked. */
  maxRiskScore: number;
  /** Scorers and their weights. */
  scorers: RiskScorerConfig[];
}

/**
 * A spending grant extended with rate limits, rolling budgets and risk policy.
 * The inherited `SpendingGrant` fields (total budget, per-payment limit,
 * merchant/purpose allowlists, expiry) remain enforced exactly as in payai.
 */
export interface EnhancedSpendingGrant extends SpendingGrant {
  rollingWindows?: RollingWindow[];
  frequencyLimits?: FrequencyLimit[];
  riskPolicy?: RiskPolicy;
}

/** Usage detail for a frequency-limit denial. */
export interface FrequencyUsage {
  windowMs: number;
  currentCount: number;
  maxCount: number;
  remainingCount: number;
}

/** Contribution of one risk scorer to the aggregate score. */
export interface RiskFactor {
  scorer: string;
  score: number;
  weight: number;
  reason: string;
}

/** A payment decision enriched with risk and frequency context. */
export interface EnhancedPaymentDecision extends PaymentDecision {
  riskScore?: number;
  riskFactors?: RiskFactor[];
  frequencyUsage?: FrequencyUsage;
}
