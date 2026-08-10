import type { DecisionDetail } from "@/types/dashboard";
import { money, windowLabel } from "./format";

export interface DecisionExplanation {
  allowed: boolean;
  code: string;
  title: string;
  summary: string;
  /** Point-by-point "why" for the decision. */
  detail: string[];
}

export interface ExplainInput {
  reason: string;
  merchant?: string;
  amount?: string;
  currency?: string;
  riskScore?: number | null;
  detail?: DecisionDetail | null;
}

/**
 * Turn a policy-engine reason code into a human-readable explanation. The
 * engine returns structured signals (reason, risk factors, frequency usage,
 * spent/remaining); this surfaces them in plain language so operators can
 * understand *why* an autonomous payment was allowed or blocked.
 */
export function explainDecision(input: ExplainInput): DecisionExplanation {
  const { reason, merchant, amount, currency = "USDC", riskScore } = input;
  const d = input.detail;
  const m = merchant ? ` to “${merchant}”` : "";

  switch (reason) {
    case "allowed":
      return {
        allowed: true,
        code: reason,
        title: "Payment allowed",
        summary: `The payment${m} passed every check in this grant's policy, so it was settled.`,
        detail: ["All rule classes (budget, limits, allowlists, rate limits, rolling windows, risk) evaluated before settlement."],
      };

    case "merchant_not_allowed":
      return {
        allowed: false,
        code: reason,
        title: "Merchant not allowlisted",
        summary: `The merchant${m} is not on this grant's merchant allowlist; the payment was blocked before it could settle.`,
        detail: ["Autonomous agents are confined to approved merchants so they can never pay an unintended recipient."],
      };

    case "purpose_not_allowed":
      return {
        allowed: false,
        code: reason,
        title: "Purpose not allowlisted",
        summary: "The declared purpose of this payment is outside the grant's purpose allowlist.",
        detail: [`Purpose recorded: ${d?.purpose || "unknown"}. Repeat payments only inside allowlisted purposes.`],
      };

    case "per_payment_limit_exceeded":
      return {
        allowed: false,
        code: reason,
        title: "Over the per-payment limit",
        summary: `This payment (${money(amount ?? "0", currency)}) exceeds the grant's per-payment cap of ${
          d?.perPaymentLimit ? money(d.perPaymentLimit.amount, d.perPaymentLimit.currency) : "the configured limit"
        }.`,
        detail: ["A single payment cannot exceed the cap, even if the lifetime budget has room."],
      };

    case "budget_exceeded":
      return {
        allowed: false,
        code: reason,
        title: "Lifetime budget exhausted",
        summary: "Spending this amount would push the grant past its total lifetime budget.",
        detail: [
          `Spent so far: ${money(d?.spent?.amount ?? "0", currency)}`,
          `Remaining: ${money(d?.remaining?.amount ?? "0", currency)}`,
        ],
      };

    case "grant_expired":
      return {
        allowed: false,
        code: reason,
        title: "Grant expired",
        summary: "This grant's authority has expired and can no longer approve payments.",
        detail: ["Create or extend a grant to let the agent keep spending."],
      };

    case "quote_expired":
      return {
        allowed: false,
        code: reason,
        title: "Price quotation expired",
        summary: "The merchant's price quotation was no longer valid by the time it was evaluated.",
        detail: ["The agent should re-request a fresh quote from the merchant."],
      };

    case "currency_mismatch":
      return {
        allowed: false,
        code: reason,
        title: "Currency mismatch",
        summary: "The payment asset does not match the currency this grant is denominated in.",
        detail: [`Grant currency: ${currency}`],
      };

    case "frequency_limit_exceeded":
      return {
        allowed: false,
        code: reason,
        title: "Rate limit reached",
        summary: "This payment would exceed the grant's transaction-frequency cap.",
        detail: [
          d?.frequencyUsage
            ? `${d.frequencyUsage.currentCount} of ${d.frequencyUsage.maxCount} payments already used within the last ${windowLabel(d.frequencyUsage.windowMs)}.`
            : "The grant allows only a limited number of payments within its rolling window.",
          "Rate limits stop an agent from rapid-fire spending in a short burst.",
        ],
      };

    case "rolling_window_budget_exceeded":
      return {
        allowed: false,
        code: reason,
        title: "Rolling-window budget exceeded",
        summary: "This payment would push the grant over its budgeted spend for the current rolling window.",
        detail: [
          d?.rollingWindow
            ? `Window budget is capped at ${money(d.rollingWindow.maxSpend, currency)} per ${windowLabel(d.rollingWindow.windowMs)}.`
            : "The grant has a temporary budget that resets on a rolling time window.",
          "The window resets as time passes, allowing spend again once old payments fall out of the window.",
        ],
      };

    case "rolling_window_frequency_exceeded":
      return {
        allowed: false,
        code: reason,
        title: "Rolling-window transaction cap hit",
        summary: "The grant allows only a set number of payments within its rolling window.",
        detail: ["Wait for the window to roll over before the agent can transact again."],
      };

    case "risk_score_exceeded":
      return {
        allowed: false,
        code: reason,
        title: "Blocked by risk policy",
        summary: `The payment scored ${riskScore ?? "—"}/100 on this grant's risk model, exceeding the block threshold.`,
        detail: [
          ...(d?.riskFactors ?? []).map(
            (f) => `${f.scorer} factor: ${f.score} × weight ${f.weight}`,
          ),
          "Risk signals (amount vs. limit, payment velocity, merchant trust) are combined; a burst or unusually large payment pushes the score up.",
        ],
      };

    default:
      return {
        allowed: false,
        code: reason,
        title: reason.replaceAll("_", " "),
        summary: "The payment was blocked by a policy rule.",
        detail: ["See the grant's policy configuration for the full set of enforced rules."],
      };
  }
}