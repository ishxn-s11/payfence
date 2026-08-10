import { clamp, type RiskContext, type RiskScorer } from "./scorer.js";

/** A registry that maps a merchant to a reputation/risk score (0..100). */
export interface MerchantRegistry {
  getRisk(merchant: string): Promise<number | undefined>;
}

/**
 * Scores a payment by merchant trust:
 * - an explicit registry score is used when available;
 * - a merchant outside the grant allowlist is high risk;
 * - an allowlisted merchant is low risk;
 * - with no allowlist, an unknown merchant gets a medium baseline.
 */
export class MerchantRiskScorer implements RiskScorer {
  readonly type = "merchant";

  constructor(private readonly registry?: MerchantRegistry) {}

  async score(context: RiskContext): Promise<number> {
    const { grant, quote } = context;

    if (this.registry) {
      const registered = await this.registry.getRisk(quote.merchant);
      if (registered !== undefined) return clamp(registered);
    }

    if (grant.allowedMerchants?.length) {
      return grant.allowedMerchants.includes(quote.merchant) ? 10 : 90;
    }

    return 40;
  }
}
