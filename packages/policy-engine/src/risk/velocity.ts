import { clamp, type RiskContext, type RiskScorer } from "./scorer.js";

/**
 * Scores a payment by the number of recent transactions (velocity).
 * Each payment in the trailing window adds `perTxScore` up to a maximum of 100.
 */
export class VelocityRiskScorer implements RiskScorer {
  readonly type = "velocity";

  constructor(
    private readonly windowMs = 60_000,
    private readonly perTxScore = 25,
  ) {}

  async score(context: RiskContext): Promise<number> {
    const start = new Date(context.now.getTime() - this.windowMs);
    const count = await context.ledger.getTransactionCount(
      context.grant.id,
      start,
      context.now,
    );
    return clamp(count * this.perTxScore);
  }
}
