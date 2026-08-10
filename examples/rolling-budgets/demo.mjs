import { MemoryEnhancedLedger } from "@pay-fence/ledger-persistent";
import { createEnhancedPayAIFetch } from "@pay-fence/policy-engine";
import { createMockNetwork, mockPayer } from "../_lib/network.mjs";
import { call, explain, heading, info, showGrant, showLedger } from "../_lib/report.mjs";

const network = createMockNetwork([
  { host: "data.example.com", prices: { "/a": "0.40", "/b": "0.40", "/c": "0.40" } },
]);

const grant = {
  id: "grant_rolling",
  agentId: "research-agent",
  totalBudget: { amount: "10", currency: "USDC" }, // lifetime cap
  perPaymentLimit: { amount: "0.50", currency: "USDC" },
  allowedMerchants: ["data.example.com"],
  rollingWindows: [
    { windowMs: 86_400_000, maxSpend: { amount: "1", currency: "USDC" } }, // 1 USDC / 24h
  ],
};

const ledger = new MemoryEnhancedLedger();
const payaiFetch = createEnhancedPayAIFetch({
  grant,
  ledger,
  fetch: network,
  payer: mockPayer,
  onReceipt: (r) => info(`settled: ${r.amount.amount} USDC (${r.transactionHash})`),
});

heading("Rolling-budget grant (1 USDC per rolling 24h window)");
showGrant(grant);

explain("Each payment is within the per-payment and lifetime limits. Once the window's");
explain("spend would exceed 1 USDC, the rolling window blocks.");

await call("payment A (0.40 USDC)", payaiFetch, "https://data.example.com/a");
await call("payment B (0.40 USDC)", payaiFetch, "https://data.example.com/b");

heading("3 · Payment that would tip the window over 1 USDC");
await call("payment C (0.40 USDC)", payaiFetch, "https://data.example.com/c");

showLedger(ledger, grant.id);