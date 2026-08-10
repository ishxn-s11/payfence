import { MemoryEnhancedLedger } from "@pay-fence/ledger-persistent";
import {
  AmountRiskScorer,
  VelocityRiskScorer,
  createEnhancedPayAIFetch,
} from "@pay-fence/policy-engine";
import { createMockNetwork, mockPayer } from "../_lib/network.mjs";
import { call, explain, heading, info, showGrant, showLedger } from "../_lib/report.mjs";

const network = createMockNetwork([
  { host: "data.example.com", prices: { "/report": "0.05", "/large": "1.00" } },
]);

const grant = {
  id: "grant_risk",
  agentId: "research-agent",
  totalBudget: { amount: "10", currency: "USDC" },
  perPaymentLimit: { amount: "1", currency: "USDC" },
  allowedMerchants: ["data.example.com"],
  riskPolicy: {
    maxRiskScore: 50,
    scorers: [
      { type: "amount", weight: 0.6 },
      { type: "velocity", weight: 0.4 },
    ],
  },
};

const ledger = new MemoryEnhancedLedger();
const payaiFetch = createEnhancedPayAIFetch({
  grant,
  ledger,
  fetch: network,
  payer: mockPayer,
  riskScorers: [new AmountRiskScorer(), new VelocityRiskScorer(60_000, 40)],
  onRiskAlert: (alert) => {
    const factors = alert.decision.riskFactors?.map((f) => `${f.scorer}=${f.score}`).join(", ");
    info(`risk alert: score=${alert.decision.riskScore}  [${factors}]`);
  },
  onReceipt: (r) => info(`settled: ${r.amount.amount} USDC (${r.transactionHash})`),
});

heading("Risk-scoring grant (aggregate amount + velocity, block above 50)");
showGrant(grant);

heading("1 · Small payment");
explain("Low amount risk, no history yet → aggregate stays under the threshold.");
await call("research report (0.05 USDC)", payaiFetch, "https://data.example.com/report", { purpose: "research" });

heading("2 · Large payment immediately after");
explain("High amount risk (≈limit) plus rising velocity pushes the aggregate over 50.");
await call("large pull (1.00 USDC)", payaiFetch, "https://data.example.com/large", { purpose: "research" });

heading("3 · Another small payment in quick succession");
explain("Velocity now dominates, but amount is tiny — aggregate stays under 50 and it settles.");
await call("research report again (0.05 USDC)", payaiFetch, "https://data.example.com/report", { purpose: "research" });

showLedger(ledger, grant.id);