# Pay-Fence

A **policy-enforcement layer for x402 AI agent payments**. It validates every
autonomous payment against configurable rules — spending limits, merchant
allowlists, transaction frequency, rolling budgets, and risk policies — *before
settlement*, so an agent can pay seamlessly without being able to overspend or
reach unintended merchants.

> x402 answers *how* an agent pays. Pay-Fence answers *should this
> agent be allowed to pay, right now, for this merchant, for this much?*

## The problem

AI agents that can make autonomous payments introduce real financial risk:
accidental large transfers, payments to the wrong recipient, rapid-fire spending,
or a slowly draining budget. Post-payment monitoring only catches damage after
settlement. The answer is a **fail-closed policy layer** interposed between agent
intent and settlement.

## What it does

Every payment goes through a strict evaluation pipeline. **No payment reaches
settlement unless every enabled rule passes**:

| # | Rule | Source | Denied when |
|---|------|--------|-------------|
| 1 | Currency match | payai | asset differs from grant |
| 2 | Grant expiry | payai | grant past `expiresAt` |
| 3 | Quote expiry | payai | quoted price past its `expiresAt` |
| 4 | Merchant allowlist | payai | merchant not in `allowedMerchants` |
| 5 | Purpose allowlist | payai | purpose not in `allowedPurposes` |
| 6 | Per-payment limit | payai | amount > `perPaymentLimit` |
| 7 | **Total budget** | payai | spend + amount > `totalBudget` |
| 8 | **Frequency limit** | *new* | too many payments in a sliding window (per grant, per merchant, or per purpose) |
| 9 | **Rolling-window budget** | *new* | window spend + amount > `maxSpend`, or `maxTransactions` hit |
| 10 | **Risk score** | *new* | weighted risk signals exceed `maxRiskScore` |

## Layout

```
packages/
  ledger-persistent/   @pay-fence/ledger-persistent
                       Money math (BigInt, 6-decimal minor units) + the
                       EnhancedSpendingLedger interface with time-windowed
                       queries, plus Memory- and SQL (node:sqlite) backends.
  policy-engine/       @pay-fence/policy-engine
                       Types, the evaluateEnhancedPayment pipeline, frequency /
                       rolling-window checks, the pluggable risk framework, and
                       the createEnhancedPayAIFetch x402 wrapper.
examples/
  basic-usage/         per-payment limit + merchant/purpose allowlists
  frequency-limits/    max N payments per minute
  risk-scoring/        weighted amount + velocity risk, block above threshold
  rolling-budgets/     1 USDC per rolling 24h window
```

## Quickstart

Requires Node 22.5+ (uses the built-in `node:sqlite`, no native compilation).

```bash
npm install
npm run check        # type-check + build + run the 46-test suite
npm run demo         # basic usage    (npm run demo:frequency / :risk / :rolling)
```

## Using the policy engine

```ts
import { MemoryEnhancedLedger } from "@pay-fence/ledger-persistent";
import {
  AmountRiskScorer,
  VelocityRiskScorer,
  createEnhancedPayAIFetch,
} from "@pay-fence/policy-engine";

const grant = {
  id: "grant_research",
  agentId: "research-agent",
  totalBudget:            { amount: "10", currency: "USDC" }, // lifetime cap
  perPaymentLimit:        { amount: "0.25", currency: "USDC" },
  allowedMerchants: ["data.example.com"],
  allowedPurposes: ["research"],
  frequencyLimits: [{ windowMs: 60_000, maxTransactions: 10 }], // 10/min
  rollingWindows:  [{ windowMs: 86_400_000, maxSpend: { amount: "5", currency: "USDC" } }],
  riskPolicy: {
    maxRiskScore: 50,
    scorers: [
      { type: "amount", weight: 0.6 },
      { type: "velocity", weight: 0.4 },
    ],
  },
};

const payaiFetch = createEnhancedPayAIFetch({
  grant,
  ledger: new MemoryEnhancedLedger(),
  payer: signAndSettle,                       // your x402 client / facilitator
  riskScorers: [new AmountRiskScorer(), new VelocityRiskScorer()],
});

// A fully autonomous, policy-governed payment:
const res = await payaiFetch("https://data.example.com/report", { purpose: "research" });
```

The flow inside `createEnhancedPayAIFetch`:

```
agent request ──► merchant returns HTTP 402 ──► parse x402 quote
    ──► evaluateEnhancedPayment ──deny──► throws PaymentPolicyError (never settles)
    ──allow──► payer hook attaches x402 proof / settles
    ──► receipt recorded to the ledger ──► paid resource returned
```

Non-402 responses pass through untouched. `onRiskAlert` fires whenever a risk
score is computed (allowed or not) so you can monitor, and `onReceipt` fires
after each settlement.

### Policy decisions, not just booleans

`EnhancedPaymentDecision` carries structured context to the agent:

```ts
{
  allowed: false,
  reason: "risk_score_exceeded",
  riskScore: 76,
  riskFactors: [ { scorer: "amount", score: 100, weight: 0.6, reason: "amount risk signal" },
                 { scorer: "velocity", score: 40, weight: 0.4, reason: "velocity risk signal" } ],
  spent: { amount: "0.05", currency: "USDC" },
  remaining: { amount: "9.95", currency: "USDC" },
}
```

## The risk framework

`RiskScorer` is a tiny interface (`{ type: string; score(ctx): Promise<number> }`
returning 0–100). Three are built in, and any custom scorer can be registered and
referenced by name from a grant's `riskPolicy.scorers`:

- **AmountRiskScorer** — payment size relative to the per-payment limit.
- **VelocityRiskScorer** — count of payments in a trailing window.
- **MerchantRiskScorer** — registry reputation, or a penalty when a merchant is
  outside the grant allowlist.

Weights are normalized, so they don't need to sum to 1.

## The ledger

`EnhancedSpendingLedger` extends payai's `SpendingLedger` with async, indexed
time-windowed queries (`getTransactionCount`, `getSpentInWindow`, `listRecent`)
that power the frequency and rolling-budget rules.

- **MemoryEnhancedLedger** — in-memory, for tests and prototypes.
- **SQLEnhancedLedger** — SQLite via `node:sqlite`, with indexes on
  `(grant_id, created_at)`, `(grant_id, merchant, created_at)` and
  `(grant_id, purpose, created_at)`. Amounts are persisted as integer minor
  units to avoid floating-point error.

New backends (Redis, Postgres, remote) only need to implement the interface.

## Organization dashboard

An interactive **Next.js** web app (`packages/dashboard`) that runs the policy engine
as a live control plane. It shares a SQLite database with the engine ledger, so
every evaluation updates real budget/rate-limit state.

```bash
npm run dashboard:dev     # next dev (default http://localhost:3000)
npm run dashboard:start   # production build, then next start
```

Pages:
- **Overview** — org KPIs, spend-over-time, denial-by-rule, risk distribution,
  top merchants, active grants, recent attempts.
- **Grants** — create/edit/delete grants with a full policy builder: budget,
  per-payment limit, merchant/purpose allowlists, rate limits, rolling windows,
  and a risk-policy builder (scorer weights + block threshold). Live budget and
  rate-limit usage meters come straight from the engine ledger.
- **Agents** — enroll agents and inspect their grants and payment history.
- **Payments** — a live (auto-refreshing) feed of every attempt and its policy
  decision, filterable by agent/merchant/outcome, with settlement hashes.
- **Simulator** — craft a payment and run it through the *real*
  `evaluateEnhancedPayment` pipeline (dry-run or persisted), showing exactly
  which rule would block it, the weighted risk factors, and budget impact.
- **Analytics** — spend series, denial reasons, risk-score distribution, top
  merchants, and per-agent activity.

Everything is driven by the same `packages/policy-engine` and
`packages/ledger-persistent` libraries used by autonomous agents — the dashboard
is a management surface, not a separate enforcement path. A "Load demo data"
button seeds three agents, three policies, and ~75 payment attempts spanning all
four deny rule classes.

## Future work

- **Gateway service** — a centralized, deployed `pay-fence` HTTP
  service (AgentSpendGuard-style) so policies are managed in one place.
- **Approval workflows** — human-in-the-loop for payments that fall between the
  risk thresholds (`requireApprovalAbove`), with timeout → default-deny.
- **Redis ledger backend** for shared, low-latency counter/ledger state.
- **Webhook alerts** on high-risk or denied payments.
