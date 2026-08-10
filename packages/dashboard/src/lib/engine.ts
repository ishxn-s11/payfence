import {
  AmountRiskScorer,
  MerchantRiskScorer,
  VelocityRiskScorer,
  type EnhancedSpendingGrant,
  type PaymentQuote,
  type PaymentReceipt,
  type RiskScorer,
} from "@pay-fence/policy-engine";

/** The risk scorers the dashboard registers for live evaluation. */
export function defaultRiskScorers(): RiskScorer[] {
  return [new AmountRiskScorer(), new VelocityRiskScorer(), new MerchantRiskScorer()];
}

export interface ReceiptInput {
  grant: EnhancedSpendingGrant;
  quote: PaymentQuote;
  id: string;
  transactionHash: string;
  createdAt: string;
}

export function makeReceipt(input: ReceiptInput): PaymentReceipt {
  return {
    id: input.id,
    grantId: input.grant.id,
    agentId: input.grant.agentId,
    merchant: input.quote.merchant,
    amount: input.quote.amount,
    purpose: input.quote.purpose,
    rail: input.quote.rail ?? "x402",
    network: input.quote.network ?? "base",
    resource: input.quote.resource,
    transactionHash: input.transactionHash,
    createdAt: input.createdAt,
  };
}