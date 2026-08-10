import test from "node:test";
import assert from "node:assert/strict";
import { MemoryEnhancedLedger } from "@pay-fence/ledger-persistent";
import { checkFrequencyLimits, checkRollingWindows } from "../dist/index.js";

const NOW = new Date("2026-08-04T12:00:00.000Z");

function receipt(overrides = {}) {
  return {
    id: overrides.id ?? `r_${Math.random().toString(36).slice(2, 10)}`,
    grantId: "grant_1",
    agentId: "agent_1",
    merchant: overrides.merchant ?? "data.example.com",
    amount: overrides.amount ?? { amount: "0.10", currency: "USDC" },
    purpose: overrides.purpose ?? "research",
    rail: "x402",
    network: "base",
    createdAt: overrides.createdAt ?? NOW.toISOString(),
  };
}

const grant = {
  id: "grant_1",
  agentId: "agent_1",
  totalBudget: { amount: "10", currency: "USDC" },
};

const quote = {
  merchant: "data.example.com",
  amount: { amount: "0.10", currency: "USDC" },
  purpose: "research",
};

test("allows when the window count is under the limit", async () => {
  const ledger = new MemoryEnhancedLedger();
  const result = await checkFrequencyLimits(
    { ...grant, frequencyLimits: [{ windowMs: 3_600_000, maxTransactions: 5 }] },
    quote,
    ledger,
    NOW,
  );
  assert.equal(result.allowed, true);
});

test("denies at the limit and reports usage", async () => {
  const ledger = new MemoryEnhancedLedger();
  for (let i = 0; i < 2; i += 1) {
    ledger.record(receipt({ createdAt: new Date(NOW.getTime() - (i + 1) * 10_000).toISOString() }));
  }
  const result = await checkFrequencyLimits(
    { ...grant, frequencyLimits: [{ windowMs: 3_600_000, maxTransactions: 2 }] },
    quote,
    ledger,
    NOW,
  );
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "frequency_limit_exceeded");
  assert.deepEqual(result.usage, {
    windowMs: 3_600_000,
    currentCount: 2,
    maxCount: 2,
    remainingCount: 0,
  });
});

test("a payment exactly at the window boundary is counted", async () => {
  const ledger = new MemoryEnhancedLedger();
  // createdAt == now - windowMs exactly → falls at the inclusive window start
  ledger.record(
    receipt({ createdAt: new Date(NOW.getTime() - 3_600_000).toISOString() }),
  );
  const result = await checkFrequencyLimits(
    { ...grant, frequencyLimits: [{ windowMs: 3_600_000, maxTransactions: 1 }] },
    quote,
    ledger,
    NOW,
  );
  assert.equal(result.allowed, false);
});

test("a payment just before the window is ignored", async () => {
  const ledger = new MemoryEnhancedLedger();
  ledger.record(
    receipt({ createdAt: new Date(NOW.getTime() - 3_600_000 - 1).toISOString() }),
  );
  const result = await checkFrequencyLimits(
    { ...grant, frequencyLimits: [{ windowMs: 3_600_000, maxTransactions: 1 }] },
    quote,
    ledger,
    NOW,
  );
  assert.equal(result.allowed, true);
});

test("applies per-merchant limits independently", async () => {
  const ledger = new MemoryEnhancedLedger();
  ledger.record(receipt({ merchant: "a.example.com", createdAt: new Date(NOW.getTime() - 10_000).toISOString() }));
  ledger.record(receipt({ merchant: "a.example.com", createdAt: new Date(NOW.getTime() - 20_000).toISOString() }));

  const limit = { windowMs: 60_000, maxTransactions: 2, perMerchant: true };
  const blocked = await checkFrequencyLimits(
    { ...grant, frequencyLimits: [limit] },
    { ...quote, merchant: "a.example.com" },
    ledger,
    NOW,
  );
  assert.equal(blocked.allowed, false);

  const allowed = await checkFrequencyLimits(
    { ...grant, frequencyLimits: [limit] },
    { ...quote, merchant: "b.example.com" },
    ledger,
    NOW,
  );
  assert.equal(allowed.allowed, true);
});

test("applies per-purpose limits independently", async () => {
  const ledger = new MemoryEnhancedLedger();
  ledger.record(receipt({ purpose: "research", createdAt: new Date(NOW.getTime() - 10_000).toISOString() }));

  const limit = { windowMs: 60_000, maxTransactions: 1, perPurpose: true };
  const blocked = await checkFrequencyLimits(
    { ...grant, frequencyLimits: [limit] },
    { ...quote, purpose: "research" },
    ledger,
    NOW,
  );
  assert.equal(blocked.allowed, false);

  const allowed = await checkFrequencyLimits(
    { ...grant, frequencyLimits: [limit] },
    { ...quote, purpose: "storage" },
    ledger,
    NOW,
  );
  assert.equal(allowed.allowed, true);
});

test("rolling window budgets account for the incoming quote amount", async () => {
  const ledger = new MemoryEnhancedLedger();
  ledger.record(
    receipt({ amount: { amount: "0.80", currency: "USDC" }, createdAt: new Date(NOW.getTime() - 10_000).toISOString() }),
  );
  const result = await checkRollingWindows(
    {
      ...grant,
      rollingWindows: [{ windowMs: 86_400_000, maxSpend: { amount: "1", currency: "USDC" } }],
    },
    { ...quote, amount: { amount: "0.25", currency: "USDC" } },
    ledger,
    NOW,
  );
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "rolling_window_budget_exceeded");
  assert.equal(result.spent, "0.8");
  assert.equal(result.limit, "1");
});
