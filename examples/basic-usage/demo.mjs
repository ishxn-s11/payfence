import { MemoryEnhancedLedger } from "@pay-fence/ledger-persistent";
import { createEnhancedPayAIFetch } from "@pay-fence/policy-engine";
import { createMockNetwork, mockPayer } from "../_lib/network.mjs";
import { call, heading, info, showGrant, showLedger } from "../_lib/report.mjs";

const network = createMockNetwork([
  { host: "data.example.com", prices: { "/report": "0.10", "/expensive": "0.50" } },
  { host: "other.example.com", prices: { "/report": "0.10" } },
]);

const grant = {
  id: "grant_basic",
  agentId: "research-agent",
  totalBudget: { amount: "5", currency: "USDC" },
  perPaymentLimit: { amount: "0.25", currency: "USDC" },
  allowedMerchants: ["data.example.com"],
  allowedPurposes: ["research"],
  expiresAt: "2099-01-01T00:00:00.000Z",
};

const ledger = new MemoryEnhancedLedger();
const payaiFetch = createEnhancedPayAIFetch({
  grant,
  ledger,
  fetch: network,
  payer: mockPayer,
  onReceipt: (r) => info(`settled: ${r.amount.amount} ${r.amount.currency} → ${r.merchant} (${r.transactionHash})`),
});

heading("Basic-usage grant (limits + allowlists, reusing payai rules)");
showGrant(grant);

heading("1 · Payment within limits");
await call("research report (0.10 USDC)", payaiFetch, "https://data.example.com/report", { purpose: "research" });

heading("2 · Payment over the per-payment limit");
await call("expensive report (0.50 USDC)", payaiFetch, "https://data.example.com/expensive", { purpose: "research" });

heading("3 · Payment to a merchant not on the allowlist");
await call("unknown merchant (0.10 USDC)", payaiFetch, "https://other.example.com/report", { purpose: "research" });

showLedger(ledger, grant.id);