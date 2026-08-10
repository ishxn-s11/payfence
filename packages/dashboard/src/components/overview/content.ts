/**
 * Static narrative content for the Overview dashboard's About / Use-cases /
 * Feasibility sections. All facts are grounded in the repo README.
 */

export interface RuleItem {
  n: number;
  name: string;
  source: "payai" | "new";
  denyWhen: string;
}

/** The 10-rule evaluation pipeline. Rules 1–7 from @payai-sh/core; 8–10 are this project's additions. */
export const RULES: RuleItem[] = [
  { n: 1, name: "Currency match", source: "payai", denyWhen: "asset differs from grant" },
  { n: 2, name: "Grant expiry", source: "payai", denyWhen: "grant past `expiresAt`" },
  { n: 3, name: "Quote expiry", source: "payai", denyWhen: "quoted price past its `expiresAt`" },
  { n: 4, name: "Merchant allowlist", source: "payai", denyWhen: "merchant not in `allowedMerchants`" },
  { n: 5, name: "Purpose allowlist", source: "payai", denyWhen: "purpose not in `allowedPurposes`" },
  { n: 6, name: "Per-payment limit", source: "payai", denyWhen: "amount > `perPaymentLimit`" },
  { n: 7, name: "Total budget", source: "payai", denyWhen: "spend + amount > `totalBudget`" },
  { n: 8, name: "Frequency limit", source: "new", denyWhen: "too many payments in a sliding window (per grant, merchant, or purpose)" },
  { n: 9, name: "Rolling-window budget", source: "new", denyWhen: "window spend + amount > `maxSpend`, or `maxTransactions` hit" },
  { n: 10, name: "Risk score", source: "new", denyWhen: "weighted risk signals exceed `maxRiskScore`" },
];

export interface UseCase {
  domain: string;
  headline: string;
  prevents: string;
  rules: number[];
}

/** Use cases by organization domain. */
export const USE_CASES: UseCase[] = [
  {
    domain: "Finance / Treasury",
    headline: "Cap settlement exposure",
    prevents: "Accidental large transfers and silently draining budgets from autonomous spend.",
    rules: [6, 7, 9],
  },
  {
    domain: "Procurement",
    headline: "Confine suppliers",
    prevents: "Payments to unintended vendors or for off-policy purposes.",
    rules: [4, 5, 3],
  },
  {
    domain: "IT / DevOps",
    headline: "Stop runaway agent loops",
    prevents: "Runaway agent loops billing cloud/API usage unchecked.",
    rules: [8, 6],
  },
  {
    domain: "R&D / Research agents",
    headline: "Govern model-inference spend",
    prevents: "Runaway research-agent spend on data, models and inference APIs.",
    rules: [5, 8, 10],
  },
  {
    domain: "Operations",
    headline: "Smooth ops-tooling spend",
    prevents: "Ops tooling exceeding daily or rolling cost envelopes.",
    rules: [9, 7],
  },
  {
    domain: "Compliance / Audit",
    headline: "Immutable decision ledger",
    prevents: "Un-auditable or post-hoc-discovered spend — every decision is recorded fail-closed.",
    rules: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    domain: "Sales / Marketing",
    headline: "Per-agent campaign caps",
    prevents: "Campaign tooling and ad-platform vendors exceeding allocated budgets.",
    rules: [4, 7],
  },
  {
    domain: "HR",
    headline: "Guard benefits & expense lookups",
    prevents: "HR agents spending outside approved purposes or at elevated risk.",
    rules: [5, 10],
  },
];

export interface FeasibilityRow {
  institution: string;
  readiness: "High" | "High–Medium" | "Medium";
  benefit: string;
  consideration: string;
  focus: string;
}

/** Feasibility matrix by institution type. */
export const FEASIBILITY: FeasibilityRow[] = [
  {
    institution: "Enterprises",
    readiness: "High",
    benefit: "Immediate spend control for the growing fleet of internal AI agents.",
    consideration: "Wire the `payer` hook to an existing x402 client / corporate card rail.",
    focus: "Rules 4, 7, 8",
  },
  {
    institution: "Banks & FinTech",
    readiness: "High–Medium",
    benefit: "A policy layer for agent-initiated payments on top of card / stablecoin rails.",
    consideration: "Regulatory mapping of fail-closed denials to transaction monitoring.",
    focus: "Rules 7, 9, 10",
  },
  {
    institution: "Universities & Research Institutes",
    readiness: "High",
    benefit: "Safe budgets for autonomous research agents buying data, compute and inference.",
    consideration: "Grant-per-lab model; allowlist approved vendors and purposes.",
    focus: "Rules 5, 8, 10",
  },
  {
    institution: "Government",
    readiness: "Medium",
    benefit: "Auditable, capped spend for automated public-service agents.",
    consideration: "Procurement rules and audit trails for every decision.",
    focus: "Rules 4, 7, 10",
  },
  {
    institution: "Healthcare",
    readiness: "Medium",
    benefit: "Controlled spend for clinical-data and records agents under strict policy.",
    consideration: "Compliance (privacy) alongside payment policy enforcement.",
    focus: "Rules 5, 10",
  },
  {
    institution: "E-commerce / Marketplaces",
    readiness: "High",
    benefit: "Per-merchant and per-session caps for shopping/fulfillment agents.",
    consideration: "High throughput — SQLite ledger scales to per-grant rate limits.",
    focus: "Rules 6, 8, 9",
  },
];

export const FUTURE_WORK: { title: string; detail: string }[] = [
  {
    title: "Gateway service",
    detail: "A centralized, deployed HTTP service so policies are managed in one place.",
  },
  {
    title: "Approval workflows",
    detail: "Human-in-the-loop for payments above a threshold (`requireApprovalAbove`), with timeout → default-deny.",
  },
  {
    title: "Redis ledger backend",
    detail: "Shared, low-latency counter/ledger state for distributed agents.",
  },
  {
    title: "Webhook alerts",
    detail: "Real-time notifications on high-risk or denied payments.",
  },
];
