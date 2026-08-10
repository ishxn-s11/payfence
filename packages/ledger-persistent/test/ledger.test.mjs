import test from "node:test";
import assert from "node:assert/strict";
import {
  MemoryEnhancedLedger,
  SQLEnhancedLedger,
  compareMoney,
  fromMinorUnits,
  toMinorUnits,
} from "../dist/index.js";

function receipt(overrides = {}) {
  return {
    id: overrides.id ?? `r_${Math.random().toString(36).slice(2, 10)}`,
    grantId: overrides.grantId ?? "grant_1",
    agentId: overrides.agentId ?? "agent_1",
    merchant: overrides.merchant ?? "data.example.com",
    amount: overrides.amount ?? { amount: "0.10", currency: "USDC" },
    purpose: overrides.purpose ?? "research",
    rail: "x402",
    network: "base",
    createdAt: overrides.createdAt ?? new Date().toISOString(),
  };
}

const backends = [
  { name: "memory", create: () => new MemoryEnhancedLedger() },
  { name: "sqlite", create: () => new SQLEnhancedLedger() },
];

for (const { name, create } of backends) {
  test(`[${name}] records receipts and sums total spend`, () => {
    const ledger = create();
    ledger.record(receipt({ amount: { amount: "0.10", currency: "USDC" } }));
    ledger.record(receipt({ amount: { amount: "0.20", currency: "USDC" } }));

    const spent = ledger.getSpent("grant_1");
    assert.equal(spent.amount, "0.3");
    assert.equal(spent.currency, "USDC");
    assert.equal(ledger.list("grant_1").length, 2);
  });

  test(`[${name}] counts transactions only inside the requested window`, async () => {
    const ledger = create();
    const now = Date.now();
    ledger.record(
      receipt({ id: "old", createdAt: new Date(now - 120_000).toISOString() }),
    );
    ledger.record(
      receipt({ id: "in1", createdAt: new Date(now - 30_000).toISOString() }),
    );
    ledger.record(
      receipt({ id: "in2", createdAt: new Date(now - 10_000).toISOString() }),
    );
    ledger.record(receipt({ id: "edge", createdAt: new Date(now).toISOString() }));

    // [now - 60s, now): "in1" and "in2" are inside; "edge" is excluded (>= end).
    const count = await ledger.getTransactionCount(
      "grant_1",
      new Date(now - 60_000),
      new Date(now),
    );
    assert.equal(count, 2);
  });

  test(`[${name}] filters transaction counts by merchant and purpose`, async () => {
    const ledger = create();
    const now = Date.now();
    ledger.record(
      receipt({
        merchant: "a.example.com",
        purpose: "research",
        createdAt: new Date(now - 10_000).toISOString(),
      }),
    );
    ledger.record(
      receipt({
        merchant: "a.example.com",
        purpose: "storage",
        createdAt: new Date(now - 10_000).toISOString(),
      }),
    );
    ledger.record(
      receipt({
        merchant: "b.example.com",
        purpose: "research",
        createdAt: new Date(now - 10_000).toISOString(),
      }),
    );

    const start = new Date(now - 60_000);
    const end = new Date(now);
    assert.equal(
      await ledger.getTransactionCount("grant_1", start, end, { merchant: "a.example.com" }),
      2,
    );
    assert.equal(
      await ledger.getTransactionCount("grant_1", start, end, { purpose: "research" }),
      2,
    );
    assert.equal(
      await ledger.getTransactionCount("grant_1", start, end, {
        merchant: "a.example.com",
        purpose: "storage",
      }),
      1,
    );
  });

  test(`[${name}] sums spend inside a rolling window`, async () => {
    const ledger = create();
    const now = Date.now();
    ledger.record(
      receipt({ amount: { amount: "0.30", currency: "USDC" }, createdAt: new Date(now - 10_000).toISOString() }),
    );
    ledger.record(
      receipt({ amount: { amount: "0.25", currency: "USDC" }, createdAt: new Date(now - 5_000).toISOString() }),
    );
    ledger.record(
      receipt({ amount: { amount: "5.00", currency: "USDC" }, createdAt: new Date(now - 7_200_000).toISOString() }),
    );

    const spent = await ledger.getSpentInWindow(
      "grant_1",
      new Date(now - 60_000),
      new Date(now),
    );
    assert.equal(spent.amount, "0.55");
  });

  test(`[${name}] lists most recent receipts first`, async () => {
    const ledger = create();
    ledger.record(receipt({ id: "oldest", createdAt: "2026-01-01T00:00:00.000Z" }));
    ledger.record(receipt({ id: "middle", createdAt: "2026-02-01T00:00:00.000Z" }));
    ledger.record(receipt({ id: "newest", createdAt: "2026-03-01T00:00:00.000Z" }));

    const recent = await ledger.listRecent("grant_1", 2);
    assert.deepEqual(
      recent.map((r) => r.id),
      ["newest", "middle"],
    );
  });
}

test("money arithmetic round-trips minor units", () => {
  assert.equal(toMinorUnits({ amount: "0.05", currency: "USDC" }), 50_000n);
  assert.equal(toMinorUnits({ amount: "1", currency: "USDC" }), 1_000_000n);
  assert.equal(toMinorUnits({ amount: "0.000001", currency: "USDC" }), 1n);

  assert.deepEqual(fromMinorUnits(1_234_567n, "USDC"), { amount: "1.234567", currency: "USDC" });
  assert.deepEqual(fromMinorUnits(50_000n, "USDC"), { amount: "0.05", currency: "USDC" });
  assert.deepEqual(fromMinorUnits(1_000_000n, "USDC"), { amount: "1", currency: "USDC" });

  assert.equal(
    compareMoney({ amount: "0.2", currency: "USDC" }, { amount: "0.20", currency: "USDC" }),
    0,
  );
  assert.equal(
    compareMoney({ amount: "0.2", currency: "USDC" }, { amount: "0.3", currency: "USDC" }),
    -1,
  );
  assert.throws(() => toMinorUnits({ amount: "0.0000001", currency: "USDC" }));
  assert.throws(() => compareMoney({ amount: "1", currency: "USDC" }, { amount: "1", currency: "USDT" }));
});

test("sqlite ledger persists across instances", async () => {
  const os = await import("node:os");
  const path = await import("node:path");
  const fs = await import("node:fs");
  const file = path.join(os.tmpdir(), `apg-${Math.random().toString(36).slice(2)}.sqlite`);
  const a = new SQLEnhancedLedger({ filename: file });
  a.record(receipt({ id: "persisted", amount: { amount: "0.42", currency: "USDC" } }));
  a.close();

  const b = new SQLEnhancedLedger({ filename: file });
  assert.equal(b.getSpent("grant_1").amount, "0.42");
  b.close();
  fs.unlinkSync(file);
});
