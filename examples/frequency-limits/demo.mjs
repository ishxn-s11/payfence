import { MemoryEnhancedLedger } from "@pay-fence/ledger-persistent";
import { createEnhancedPayAIFetch } from "@pay-fence/policy-engine";
import { createMockNetwork, mockPayer } from "../_lib/network.mjs";
import { call, explain, heading, info, showGrant, showLedger } from "../_lib/report.mjs";

const network = createMockNetwork([{ host: "data.example.com", prices: { "/report": "0.05" } }]);

const grant = {
  id: "grant_freq",
  agentId: "research-agent",
  totalBudget: { amount: "10", currency: "USDC" },
  perPaymentLimit: { amount: "0.25", currency: "USDC" },
  allowedMerchants: ["data.example.com"],
  frequencyLimits: [{ windowMs: 60_000, maxTransactions: 3 }], // 3 payments / minute
};

const ledger = new MemoryEnhancedLedger();
const payaiFetch = createEnhancedPayAIFetch({
  grant,
  ledger,
  fetch: network,
  payer: mockPayer,
  onReceipt: (r) => info(`settled: ${r.amount.amount} USDC (${r.transactionHash})`),
});

heading("Frequency-limit grant (max 3 payments per minute)");
showGrant(grant);

explain("The first three calls are allowed and settle.");
for (let i = 1; i <= 3; i += 1) {
  await call(`payment #${i}`, payaiFetch, "https://data.example.com/report", { purpose: "vibe-check" });
}

heading("4 · A fourth payment within the same minute");
explain("No configured rule on amount/merchant/budget blocks it — the frequency limit does.");
await call("payment #4", payaiFetch, "https://data.example.com/report", { purpose: "vibe-check" });

showLedger(ledger, grant.id);