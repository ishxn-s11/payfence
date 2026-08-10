import test from "node:test";
import assert from "node:assert/strict";
import { MemoryEnhancedLedger } from "@pay-fence/ledger-persistent";
import { AmountRiskScorer, VelocityRiskScorer, evaluateEnhancedPayment } from "../dist/index.js";

const NOW = new Date("2026-08-04T12:00:00.000Z");

function receipt(overrides = {}) {
  return {
    id: overrides.id ?? `r_${Math.random().toString(36).slice(2, 10)}`,
    grantId: overrides.grantId ?? "grant_1",
    agentId: "agent_1",
    merchant: overrides.merchant ?? "data.example.com",
    amount: overrides.amount ?? { amount: "0.10", currency: "USDC" },
    purpose: overrides.purpose ?? "research",
    rail: "x402",
    network: "base",
    createdAt: overrides.createdAt ?? NOW.toISOString(),
  };
}

const baseGrant = {
  id: "grant_1",
  agentId: "agent_1",
  totalBudget: { amount: "10", currency: "USDC" },
  perPaymentLimit: { amount: "1", currency: "USDC" },
  allowedMerchants: ["data.example.com"],
  allowedPurposes: ["research"],
  expiresAt: "2099-01-01T00:00:00.000Z",
};

function quote(overrides = {}) {
  return {
    merchant: overrides.merchant ?? "data.example.com",
    amount: overrides.amount ?? { amount: "0.10", currency: "USDC" },
    purpose: overrides.purpose ?? "research",
    network: "base",
    rail: "x402",
  };
}

test("allows a payment that satisfies every rule", async () => {
  const ledger = new MemoryEnhancedLedger();
  const decision = await evaluateEnhancedPayment(
    baseGrant,
    quote(),
    { ledger, now: NOW },
  );
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "allowed");
});

test("denies a merchant outside the allowlist (payai base check)", async () => {
  const ledger = new MemoryEnhancedLedger();
  const decision = await evaluateEnhancedPayment(
    baseGrant,
    quote({ merchant: "evil.example.com" }),
    { ledger, now: NOW },
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "merchant_not_allowed");
});

test("denies an amount over the per-payment limit (payai base check)", async () => {
  const ledger = new MemoryEnhancedLedger();
  const decision = await evaluateEnhancedPayment(
    baseGrant,
    quote({ amount: { amount: "2", currency: "USDC" } }),
    { ledger, now: NOW },
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "per_payment_limit_exceeded");
});

test("denies when the total budget is exhausted (payai base check)", async () => {
  const ledger = new MemoryEnhancedLedger();
  ledger.record(receipt({ amount: { amount: "9.95", currency: "USDC" } }));
  const decision = await evaluateEnhancedPayment(
    baseGrant,
    quote({ amount: { amount: "0.10", currency: "USDC" } }),
    { ledger, now: NOW },
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "budget_exceeded");
});

test("denies when the frequency limit is reached", async () => {
  const ledger = new MemoryEnhancedLedger();
  const grant = {
    ...baseGrant,
    frequencyLimits: [{ windowMs: 3_600_000, maxTransactions: 3 }],
  };
  for (let i = 0; i < 3; i += 1) {
    ledger.record(
      receipt({ createdAt: new Date(NOW.getTime() - (i + 1) * 60_000).toISOString() }),
    );
  }

  const decision = await evaluateEnhancedPayment(grant, quote(), { ledger, now: NOW });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "frequency_limit_exceeded");
  assert.equal(decision.frequencyUsage.maxCount, 3);
  assert.equal(decision.frequencyUsage.currentCount, 3);
  assert.equal(decision.frequencyUsage.remainingCount, 0);
});

test("allows within the frequency limit", async () => {
  const ledger = new MemoryEnhancedLedger();
  const grant = {
    ...baseGrant,
    frequencyLimits: [{ windowMs: 3_600_000, maxTransactions: 3 }],
  };
  ledger.record(
    receipt({ createdAt: new Date(NOW.getTime() - 60_000).toISOString() }),
  );

  const decision = await evaluateEnhancedPayment(grant, quote(), { ledger, now: NOW });
  assert.equal(decision.allowed, true);
});

test("denies when a rolling window budget would be exceeded", async () => {
  const ledger = new MemoryEnhancedLedger();
  const grant = {
    ...baseGrant,
    rollingWindows: [
      { windowMs: 86_400_000, maxSpend: { amount: "1", currency: "USDC" } },
    ],
  };
  ledger.record(
    receipt({
      amount: { amount: "0.90", currency: "USDC" },
      createdAt: new Date(NOW.getTime() - 3_600_000).toISOString(),
    }),
  );

  const decision = await evaluateEnhancedPayment(
    grant,
    quote({ amount: { amount: "0.20", currency: "USDC" } }),
    { ledger, now: NOW },
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "rolling_window_budget_exceeded");
});

test("ignores spend older than the rolling window", async () => {
  const ledger = new MemoryEnhancedLedger();
  const grant = {
    ...baseGrant,
    rollingWindows: [
      { windowMs: 86_400_000, maxSpend: { amount: "1", currency: "USDC" } },
    ],
  };
  ledger.record(
    receipt({
      amount: { amount: "0.90", currency: "USDC" },
      createdAt: new Date(NOW.getTime() - 2 * 86_400_000).toISOString(),
    }),
  );

  const decision = await evaluateEnhancedPayment(
    grant,
    quote({ amount: { amount: "0.20", currency: "USDC" } }),
    { ledger, now: NOW },
  );
  assert.equal(decision.allowed, true);
});

test("denies when the risk score exceeds the threshold", async () => {
  const ledger = new MemoryEnhancedLedger();
  const grant = {
    ...baseGrant,
    riskPolicy: { maxRiskScore: 50, scorers: [{ type: "amount", weight: 1 }] },
  };

  // quote == perPaymentLimit → amount risk 100
  const decision = await evaluateEnhancedPayment(
    grant,
    quote({ amount: { amount: "1", currency: "USDC" } }),
    { ledger, now: NOW, riskScorers: [new AmountRiskScorer()] },
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "risk_score_exceeded");
  assert.equal(decision.riskScore, 100);
  assert.equal(decision.riskFactors[0].scorer, "amount");
});

test("computes an aggregate risk score from multiple scorers", async () => {
  const ledger = new MemoryEnhancedLedger();
  const grant = {
    ...baseGrant,
    riskPolicy: {
      maxRiskScore: 70,
      scorers: [
        { type: "amount", weight: 0.5 },
        { type: "velocity", weight: 0.5 },
      ],
    },
  };

  // 0.50 / 1.00 limit → amount 50; no history → velocity 0; aggregate 25
  const decision = await evaluateEnhancedPayment(
    grant,
    quote({ amount: { amount: "0.50", currency: "USDC" } }),
    {
      ledger,
      now: NOW,
      riskScorers: [new AmountRiskScorer(), new VelocityRiskScorer()],
    },
  );
  assert.equal(decision.allowed, true);
  assert.equal(decision.riskScore, 25);
  assert.equal(decision.riskFactors.length, 2);
});

test("skips risk scoring when no scorers are registered", async () => {
  const ledger = new MemoryEnhancedLedger();
  const grant = {
    ...baseGrant,
    riskPolicy: { maxRiskScore: 50, scorers: [{ type: "amount", weight: 1 }] },
  };
  const decision = await evaluateEnhancedPayment(grant, quote(), { ledger, now: NOW });
  assert.equal(decision.allowed, true);
  assert.equal(decision.riskScore, undefined);
});
