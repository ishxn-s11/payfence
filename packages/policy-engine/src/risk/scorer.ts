import type { PaymentQuote } from "@payai-sh/core";
import type { EnhancedSpendingLedger } from "@pay-fence/ledger-persistent";
import type {
  EnhancedSpendingGrant,
  RiskFactor,
  RiskScorerConfig,
} from "../types.js";

export interface RiskContext {
  grant: EnhancedSpendingGrant;
  quote: PaymentQuote;
  ledger: EnhancedSpendingLedger;
  /** The evaluation timestamp, for deterministic windows. */
  now: Date;
}

/**
 * A pluggable risk scorer. `score` returns 0 (no risk) to 100 (maximum risk).
 * Register instances by their `type` name; grants reference them in their
 * `riskPolicy.scorers` configuration.
 */
export interface RiskScorer {
  type: string;
  score(context: RiskContext): Promise<number>;
}

export interface RiskResult {
  totalScore: number;
  factors: RiskFactor[];
}

/**
 * Run the configured scorers for a grant and aggregate their weighted scores.
 * The aggregate is normalized by the sum of weights, so weights need not sum to 1.
 */
export async function calculateRiskScore(
  grant: EnhancedSpendingGrant,
  quote: PaymentQuote,
  ledger: EnhancedSpendingLedger,
  scorers: RiskScorer[],
  configs: RiskScorerConfig[],
  now: Date,
): Promise<RiskResult> {
  const factors: RiskFactor[] = [];
  let weighted = 0;
  let weightSum = 0;

  for (const config of configs) {
    const scorer = scorers.find((s) => s.type === config.type);
    if (!scorer) continue;

    const score = await scorer.score({ grant, quote, ledger, now });
    factors.push({
      scorer: config.type,
      score,
      weight: config.weight,
      reason: `${config.type} risk signal`,
    });
    weighted += score * config.weight;
    weightSum += config.weight;
  }

  const totalScore = weightSum > 0 ? clamp(weighted / weightSum) : 0;
  return { totalScore, factors };
}

export function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}
