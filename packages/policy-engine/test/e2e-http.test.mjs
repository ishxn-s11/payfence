import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { MemoryEnhancedLedger } from "@pay-fence/ledger-persistent";
import { PaymentPolicyError, createEnhancedPayAIFetch } from "../dist/index.js";

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer((req, res) => {
      if (req.url !== "/report") {
        res.writeHead(404);
        res.end();
        return;
      }
      const merchant = req.headers.host;
      if (!req.headers["x-payment"]) {
        res.writeHead(402, {
          "content-type": "application/json",
          "x-request-payment": JSON.stringify({
            amount: "0.05",
            currency: "USDC",
            merchant,
            network: "base",
            resource: "/report",
          }),
        });
        res.end(JSON.stringify({ error: "payment_required" }));
        return;
      }
      res.writeHead(200, {
        "content-type": "application/json",
        "X-Payment-Transaction": "0xsettled_e2e",
      });
      res.end(JSON.stringify({ ok: true, servedAt: new Date().toISOString() }));
    });
    server.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(() => {
  server.close();
});

async function mockPayer(request) {
  request.paymentHeaders.set("X-Payment", "mock-x402-proof");
  return request.fetch(request.paymentHeaders);
}

function makeGrant(overrides = {}) {
  return {
    id: "grant_e2e",
    agentId: "e2e-agent",
    totalBudget: { amount: "10", currency: "USDC" },
    perPaymentLimit: { amount: "1", currency: "USDC" },
    // merchant allowlist intentionally omitted: the host includes a dynamic port
    ...overrides,
  };
}

test("e2e: agent pays a real HTTP 402 merchant through the policy layer", async () => {
  const ledger = new MemoryEnhancedLedger();
  const receipts = [];

  const payaiFetch = createEnhancedPayAIFetch({
    grant: makeGrant(),
    ledger,
    onReceipt: (receipt) => receipts.push(receipt),
    payer: mockPayer,
  });

  const response = await payaiFetch(`${baseUrl}/report`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].transactionHash, "0xsettled_e2e");
  assert.equal(ledger.getSpent("grant_e2e").amount, "0.05");
});

test("e2e: frequency policy blocks a burst of payments before settlement", async () => {
  const ledger = new MemoryEnhancedLedger();
  const grant = makeGrant({
    frequencyLimits: [{ windowMs: 3_600_000, maxTransactions: 2 }],
  });
  const payaiFetch = createEnhancedPayAIFetch({
    grant,
    ledger,
    payer: mockPayer,
  });

  const first = await payaiFetch(`${baseUrl}/report`);
  assert.equal(first.status, 200);

  const second = await payaiFetch(`${baseUrl}/report`);
  assert.equal(second.status, 200);

  await assert.rejects(
    () => payaiFetch(`${baseUrl}/report`),
    (error) => {
      assert.ok(error instanceof PaymentPolicyError);
      assert.equal(error.decision.reason, "frequency_limit_exceeded");
      assert.equal(error.decision.frequencyUsage.currentCount, 2);
      return true;
    },
  );
  assert.equal(ledger.list("grant_e2e").length, 2); // only the allowed two settled
});
