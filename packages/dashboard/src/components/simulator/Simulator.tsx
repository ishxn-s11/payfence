"use client";

import { useEffect, useState } from "react";
import { api, post } from "@/lib/client";
import { fmtTime } from "@/lib/format";
import { money } from "@/lib/format";
import { inrToUsdc, rateLabel } from "@/lib/currency";
import { explainDecision, type DecisionExplanation } from "@/lib/explain";
import type { DashboardGrant, DecisionDetail } from "@/types/dashboard";
import { ReasonChip, RiskPill, StatusBadge } from "@/components/ui";
import { CountUp, Reveal } from "@/components/motion";

interface Decision {
  allowed: boolean;
  reason: string;
  riskScore?: number;
  riskFactors?: { scorer: string; score: number; weight: number }[];
  frequencyUsage?: { windowMs: number; currentCount: number; maxCount: number };
  spent: { amount: string; currency: string };
  remaining: { amount: string; currency: string };
}

interface SimResult {
  decision: Decision;
  persisted: boolean;
  transactionHash?: string | null;
  quote?: { merchant: string; amount: { amount: string; currency: string }; purpose?: string };
}

interface HistoryEntry {
  at: string;
  merchant: string;
  amount: string;
  allowed: boolean;
  reason: string;
}

function explanationFor(
  result: SimResult | null,
  grant: DashboardGrant | undefined,
  purpose: string,
  inputCurrency: string,
): DecisionExplanation | null {
  if (!result) return null;
  const d = result.decision;
  const quoteAmt = result.quote?.amount.amount ?? "";
  const detail: DecisionDetail = {
    spent: d.spent,
    remaining: d.remaining,
    purpose: result.quote?.purpose ?? purpose,
    frequencyUsage: d.frequencyUsage,
    riskFactors: d.riskFactors,
    perPaymentLimit: grant?.perPaymentLimit,
  };
  return explainDecision({
    reason: d.reason,
    merchant: result.quote?.merchant,
    amount: quoteAmt,
    currency: inputCurrency,
    riskScore: d.riskScore,
    detail,
  });
}

export function Simulator({ grants }: { grants: DashboardGrant[] }) {
  const [grantId, setGrantId] = useState(grants[0]?.id ?? "");
  const [merchant, setMerchant] = useState(grants[0]?.allowedMerchants?.[0] ?? "");
  const [amount, setAmount] = useState("0.50");
  const [unit, setUnit] = useState<"USDC" | "INR">("USDC");
  const [purpose, setPurpose] = useState("research");
  const [persist, setPersist] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [runCount, setRunCount] = useState(0);

  const activeGrant = grants.find((g) => g.id === grantId);

  // Initialize selection once grants finish loading.
  useEffect(() => {
    if (!grantId && grants.length > 0) {
      setGrantId(grants[0].id);
      setMerchant(grants[0].allowedMerchants?.[0] ?? "");
    }
  }, [grantId, grants]);

  async function run() {
    setError(null);
    if (!grantId || !merchant || !amount) {
      setError("Grant, merchant and amount are required.");
      return;
    }
    setRunning(true);
    try {
      // Normalize the amount to USDC for the engine; display stays in the chosen unit.
      const effectiveAmount =
        unit === "INR"
          ? inrToUsdc(parseFloat(amount) || 0).toFixed(6)
          : amount;

      const res = await post<SimResult>("/api/simulate", {
        grantId,
        merchant,
        amount: effectiveAmount,
        purpose,
        persist,
      });
      setResult(res);
      setRunCount((c) => c + 1);
      setHistory((h) => [
        {
          at: new Date().toISOString(),
          merchant: res.quote?.merchant ?? merchant,
          amount: res.quote?.amount.amount ?? effectiveAmount,
          allowed: res.decision.allowed,
          reason: res.decision.reason,
        },
        ...h,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setRunning(false);
    }
  }

  const d = result?.decision;
  const explanation = explanationFor(result, activeGrant, purpose, "USDC");
  const displayCurrency = activeGrant?.totalBudget.currency ?? "USDC";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-5">
        <h3 className="mb-4 font-semibold text-slate-800">Craft a payment</h3>
        <div className="space-y-4">
          <div>
            <label className="label">Grant</label>
            <select className="input" value={grantId} onChange={(e) => setGrantId(e.target.value)}>
              {grants.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.agentName} — {g.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Merchant</label>
            <input className="input font-mono text-xs" value={merchant} onChange={(e) => setMerchant(e.target.value)} list="merchant-options" />
            <datalist id="merchant-options">
              {(activeGrant?.allowedMerchants ?? []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            {activeGrant?.allowedMerchants?.length ? (
              <p className="mt-1 text-xs text-slate-400">allowlist: {activeGrant.allowedMerchants.join(", ")}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount ({unit})</label>
              <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={unit} onChange={(e) => setUnit(e.target.value as "USDC" | "INR")}>
                <option value="USDC">USDC</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Purpose</label>
            <input className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
            Persist to ledger &amp; payments feed
          </label>

          <p className="rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
            {rateLabel()} — dashboard amounts shown in INR.
          </p>

          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <button className="btn btn-primary w-full justify-center" onClick={() => void run()} disabled={running}>
            {running ? "Evaluating…" : persist ? "Run payment" : "Preview decision"}
          </button>
          <p className="text-xs text-slate-400">
            Runs the real <span className="font-mono">evaluateEnhancedPayment</span> policy engine before any
            settlement — same code an autonomous agent would hit.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Reveal key={runCount}>
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Decision</h3>
              {d && <StatusBadge allowed={d.allowed} />}
            </div>
            {!d ? (
              <p className="text-sm text-slate-400">Run a payment to see the policy decision here.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Outcome</span>
                  <ReasonChip reason={d.reason} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Risk score</span>
                  {d.riskScore != null ? (
                    <span className="font-mono text-slate-700">
                      <CountUp to={d.riskScore} format={(n) => Math.round(n).toString()} /> / 100
                    </span>
                  ) : (
                    <RiskPill score={null} />
                  )}
                </div>
                {d.riskFactors?.length ? (
                  <div>
                    <div className="mb-1 text-slate-500">Risk factors</div>
                    <ul className="space-y-1">
                      {d.riskFactors.map((f) => (
                        <li key={f.scorer} className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1">
                          <span className="text-slate-600">{f.scorer}</span>
                          <span className="tabular-nums text-slate-500">
                            {f.score} × {f.weight}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {d.frequencyUsage && (
                  <div className="rounded-md bg-orange-50 px-2.5 py-1.5 text-xs text-orange-700">
                    {d.frequencyUsage.currentCount}/{d.frequencyUsage.maxCount} payments in the last{" "}
                    {Math.round(d.frequencyUsage.windowMs / 1000)}s
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                  <div>
                    <div className="text-xs text-slate-400">Spent</div>
                    <div className="tabular-nums text-slate-700">{money(d.spent.amount, d.spent.currency)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Remaining</div>
                    <div className="tabular-nums text-slate-700">{money(d.remaining.amount, d.remaining.currency)}</div>
                  </div>
                </div>
                {result?.persisted && result.transactionHash && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-slate-500">Settlement</span>
                    <span className="font-mono text-xs text-slate-600">{result.transactionHash}</span>
                  </div>
                )}
                {result?.persisted === false && (
                  <p className="text-xs text-slate-400">Dry-run — nothing was recorded.</p>
                )}

                {explanation && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{explanation.title}</span>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">why?</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{explanation.summary}</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-500">
                      {explanation.detail.map((line, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-slate-300">•</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </Reveal>

        {history.length > 0 && (
          <div className="card">
            <div className="card-header">Session history</div>
            <ul className="divide-y divide-slate-50 text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between px-5 py-2">
                  <span className="text-xs text-slate-400">{fmtTime(h.at)}</span>
                  <span className="font-mono text-xs text-slate-600">
                    {money(h.amount, displayCurrency)} → {h.merchant}
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge allowed={h.allowed} />
                    <span className="font-mono text-xs text-slate-400">{h.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}