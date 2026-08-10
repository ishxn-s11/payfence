import test from "node:test";
import assert from "node:assert/strict";
import { MemoryEnhancedLedger } from "@pay-fence/ledger-persistent";
import {
  AmountRiskScorer,
  PaymentPolicyError,
  createEnhancedPayAIFetch,
} from "../dist/index.js";

function makeGrant(overrides = {}) {
  return {
    id: "grant_1",
    agentId: "agent_1",
    totalBudget: { amount: "10", currency: "USDC" },
    perPaymentLimit: { amount: "0.25", currency: "USDC" },
    allowedMerchants: ["data.example.com"],
    allowedPurposes: ["research"],
    ...overrides,
  };
}

/** A mock paid merchant: 402 first, then 200 once an X-Payment header is present. */
function mockPaidApi({ amount = "0.10", merchant = "data.example.com" } = {}) {
  return async function paidApi(request) {
    if (!request.headers.has("X-Payment")) {
      return Response.json(
        {
          amount,
          currency: "USDC",
          merchant,
          network: "base",
          resource: new URL(request.url).pathname,
        },
        { status: 402 },
      );
    }
    return Response.json(
      { ok: true },
      { headers: { "X-Payment-Transaction": "0xsettled" } },
    );
  };
}

async function mockPayer(request) {
  request.paymentHeaders.set("X-Payment", "mock-x402-proof");
  return request.fetch(request.paymentHeaders);
}

test("intercepts 402, evaluates policy, settles, and records a receipt", async () => {
  const ledger = new MemoryEnhancedLedger();
  const receipts = [];
  let calls = 0;

  const payaiFetch = createEnhancedPayAIFetch({
    grant: makeGrant(),
    ledger,
    onReceipt: (receipt) => receipts.push(receipt),
    fetch: async (request) => {
      calls += 1;
      return mockPaidApi()(request);
    },
    payer: mockPayer,
  });

  const response = await payaiFetch("https://data.example.com/report", { purpose: "research" });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(calls, 2); // unpaid + paid retry
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].transactionHash, "0xsettled");
  assert.equal(receipts[0].merchant, "data.example.com");
  assert.equal(ledger.getSpent("grant_1").amount, "0.1");
});

test("throws PaymentPolicyError for an unapproved merchant", async () => {
  const ledger = new MemoryEnhancedLedger();
  let payerCalled = false;

  const payaiFetch = createEnhancedPayAIFetch({
    grant: makeGrant(),
    ledger,
    fetch: async (request) => mockPaidApi({ merchant: "other.example.com" })(request),
    payer: async () => {
      payerCalled = true;
      return new Response(null, { status: 500 });
    },
  });

  await assert.rejects(
    () => payaiFetch("https://data.example.com/report", { purpose: "research" }),
    (error) => {
      assert.ok(error instanceof PaymentPolicyError);
      assert.equal(error.decision.reason, "merchant_not_allowed");
      assert.equal(error.quote.merchant, "other.example.com");
      return true;
    },
  );
  assert.equal(payerCalled, false);
});

test("throws PaymentPolicyError when risk scoring blocks a payment", async () => {
  const ledger = new MemoryEnhancedLedger();
  const grant = makeGrant({
    riskPolicy: { maxRiskScore: 50, scorers: [{ type: "amount", weight: 1 }] },
  });

  const payaiFetch = createEnhancedPayAIFetch({
    grant,
    ledger,
    riskScorers: [new AmountRiskScorer()],
    fetch: async (request) => mockPaidApi({ amount: "0.25" })(request),
    payer: mockPayer,
  });

  await assert.rejects(
    () => payaiFetch("https://data.example.com/report", { purpose: "research" }),
    (error) => {
      assert.ok(error instanceof PaymentPolicyError);
      assert.equal(error.decision.reason, "risk_score_exceeded");
      assert.equal(error.decision.riskScore, 100);
      return true;
    },
  );
  assert.equal(ledger.list("grant_1").length, 0); // nothing settled
});

test("passes through responses that are not 402", async () => {
  const ledger = new MemoryEnhancedLedger();
  let payerCalled = false;

  const payaiFetch = createEnhancedPayAIFetch({
    grant: makeGrant(),
    ledger,
    fetch: async () => Response.json({ status: "ok" }, { status: 200 }),
    payer: async () => {
      payerCalled = true;
      return new Response(null, { status: 500 });
    },
  });

  const response = await payaiFetch("https://data.example.com/report");
  assert.equal(response.status, 200);
  assert.equal(payerCalled, false);
});

test("preserves the POST body on the paid retry", async () => {
  const ledger = new MemoryEnhancedLedger();
  const bodies = [];

  const payaiFetch = createEnhancedPayAIFetch({
    grant: makeGrant(),
    ledger,
    fetch: async (request) => {
      bodies.push(await request.text());
      return mockPaidApi()(request);
    },
    payer: mockPayer,
  });

  const response = await payaiFetch("https://data.example.com/report", {
    method: "POST",
    body: JSON.stringify({ query: "agent payments" }),
    purpose: "research",
  });
  assert.equal(response.status, 200);
  assert.deepEqual(bodies, [
    JSON.stringify({ query: "agent payments" }),
    JSON.stringify({ query: "agent payments" }),
  ]);
});

test("converts atomic amounts with a tokenDecimals hint", async () => {
  const ledger = new MemoryEnhancedLedger();

  const payaiFetch = createEnhancedPayAIFetch({
    grant: makeGrant(),
    ledger,
    fetch: async (request) => {
      if (!request.headers.has("X-Payment")) {
        return Response.json(
          {
            amount: "10000", // 0.01 USDC (6 decimals)
            tokenDecimals: 6,
            currency: "USDC",
            merchant: "data.example.com",
            network: "base",
          },
          { status: 402 },
        );
      }
      return Response.json(
        { ok: true },
        { headers: { "X-Payment-Transaction": "0xsettled" } },
      );
    },
    payer: mockPayer,
  });

  const response = await payaiFetch("https://data.example.com/report", {
    purpose: "research",
  });
  assert.equal(response.status, 200);
  assert.equal(ledger.getSpent("grant_1").amount, "0.01");
});

test("emits a risk alert whenever a risk score is computed", async () => {
  const ledger = new MemoryEnhancedLedger();
  const alerts = [];
  const grant = makeGrant({
    riskPolicy: { maxRiskScore: 200, scorers: [{ type: "amount", weight: 1 }] },
  });

  const payaiFetch = createEnhancedPayAIFetch({
    grant,
    ledger,
    riskScorers: [new AmountRiskScorer()],
    onRiskAlert: (alert) => alerts.push(alert),
    fetch: async (request) => mockPaidApi({ amount: "0.05" })(request),
    payer: mockPayer,
  });

  await payaiFetch("https://data.example.com/report", { purpose: "research" });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].decision.riskScore, 20);
  assert.equal(alerts[0].decision.allowed, true);
});
