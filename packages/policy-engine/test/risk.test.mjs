import test from "node:test";
import assert from "node:assert/strict";
import { MemoryEnhancedLedger } from "@pay-fence/ledger-persistent";
import {
  AmountRiskScorer,
  MerchantRiskScorer,
  VelocityRiskScorer,
  calculateRiskScore,
} from "../dist/index.js";

const NOW = new Date("2026-08-04T12:00:00.000Z");

function receipt(overrides = {}) {
  return {
    id: overrides.id ?? `r_${Math.random().toString(36).slice(2, 10)}`,
    grantId: "grant_1",
    agentId: "agent_1",
    merchant: overrides.merchant ?? "data.example.com",
    amount: overrides.amount ?? { amount: "0.10", currency: "USDC" },
    purpose: "research",
    rail: "x402",
    network: "base",
    createdAt: overrides.createdAt ?? new Date(NOW.getTime() - 10_000).toISOString(),
  };
}

const grant = {
  id: "grant_1",
  agentId: "agent_1",
  totalBudget: { amount: "10", currency: "USDC" },
  perPaymentLimit: { amount: "1", currency: "USDC" },
};

const quote = {
  merchant: "data.example.com",
  amount: { amount: "0.10", currency: "USDC" },
  purpose: "research",
};

function score(grant, quote, ledger, scorers, configs) {
  return calculateRiskScore(grant, quote, ledger, scorers, configs, NOW);
}

test("amount scorer scales with the payment relative to the limit", async () => {
  const ledger = new MemoryEnhancedLedger();
  const scorer = new AmountRiskScorer();

  const small = await scorer.score({ grant, quote: { ...quote, amount: { amount: "0.10", currency: "USDC" } }, ledger, now: NOW });
  assert.equal(small, 10);

  const atLimit = await scorer.score({ grant, quote: { ...quote, amount: { amount: "1", currency: "USDC" } }, ledger, now: NOW });
  assert.equal(atLimit, 100);

  const overLimit = await scorer.score({ grant, quote: { ...quote, amount: { amount: "2.5", currency: "USDC" } }, ledger, now: NOW });
  assert.equal(overLimit, 100); // clamped
});

test("velocity scorer counts transactions in the trailing window", async () => {
  const ledger = new MemoryEnhancedLedger();
  const scorer = new VelocityRiskScorer(60_000, 25);

  const none = await scorer.score({ grant, quote, ledger, now: NOW });
  assert.equal(none, 0);

  ledger.record(receipt());
  ledger.record(receipt());
  ledger.record(receipt());
  const three = await scorer.score({ grant, quote, ledger, now: NOW });
  assert.equal(three, 75);

  for (let i = 0; i < 3; i += 1) ledger.record(receipt());
  const six = await scorer.score({ grant, quote, ledger, now: NOW });
  assert.equal(six, 100); // clamped
});

test("merchant scorer uses the registry when provided", async () => {
  const ledger = new MemoryEnhancedLedger();
  const scorer = new MerchantRiskScorer({
    getRisk: async (merchant) => (merchant === "suspicious.example.com" ? 95 : undefined),
  });
  assert.equal(
    await scorer.score({ grant, quote: { ...quote, merchant: "suspicious.example.com" }, ledger, now: NOW }),
    95,
  );
  assert.equal(
    await scorer.score({ grant, quote: { ...quote, merchant: "unknown.example.com" }, ledger, now: NOW }),
    40, // no allowlist → medium baseline
  );
});

test("merchant scorer penalizes merchants outside the allowlist", async () => {
  const ledger = new MemoryEnhancedLedger();
  const scorer = new MerchantRiskScorer();
  const withAllowlist = {
    ...grant,
    allowedMerchants: ["data.example.com"],
  };

  assert.equal(
    await scorer.score({ grant: withAllowlist, quote, ledger, now: NOW }),
    10,
  );
  assert.equal(
    await scorer.score({
      grant: withAllowlist,
      quote: { ...quote, merchant: "other.example.com" },
      ledger,
      now: NOW,
    }),
    90,
  );
});

test("aggregate normalizes weights that do not sum to 1", async () => {
  const ledger = new MemoryEnhancedLedger();
  const result = await score(
    grant,
    { ...quote, amount: { amount: "0.50", currency: "USDC" } },
    ledger,
    [new AmountRiskScorer()],
    [{ type: "amount", weight: 0.3 }], // weight 0.3 → 50/0.3*0.3/0.3 = 50
  );
  assert.equal(result.totalScore, 50);
  assert.equal(result.factors.length, 1);
});

test("unknown scorer types are ignored", async () => {
  const ledger = new MemoryEnhancedLedger();
  const result = await score(grant, quote, ledger, [new AmountRiskScorer()], [
    { type: "does-not-exist", weight: 1 },
  ]);
  assert.equal(result.totalScore, 0);
  assert.equal(result.factors.length, 0);
});

test("combined multi-scorer aggregate", async () => {
  const ledger = new MemoryEnhancedLedger();
  ledger.record(receipt());
  ledger.record(receipt());

  // amount 0.10 → 10; velocity (2 in window, perTx 25) → 50; aggregate (10+50)/2
  const result = await score(
    grant,
    quote,
    ledger,
    [new AmountRiskScorer(), new VelocityRiskScorer(60_000, 25)],
    [
      { type: "amount", weight: 0.5 },
      { type: "velocity", weight: 0.5 },
    ],
  );
  assert.equal(result.totalScore, 30);
  assert.deepEqual(
    result.factors.map((f) => [f.scorer, f.score]),
    [
      ["amount", 10],
      ["velocity", 50],
    ],
  );
});
