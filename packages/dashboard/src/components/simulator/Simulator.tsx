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
    <div className="grid gap-5 sm:gap-6 lg:grid-cols-5">
      <div className="card p-5 sm:p-6 lg:col-span-3">
        <h3 className="mb-4 text-lg font-semibold text-[var(--text)]">Craft a payment</h3>
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
              <p className="mt-1 text-xs text-[var(--text-faint)]">allowlist: {activeGrant.allowedMerchants.join(", ")}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
            Persist to ledger &amp; payments feed
          </label>

          <p className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-muted)]">
            {rateLabel()} — dashboard amounts shown in INR.
          </p>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <button className="btn btn-primary w-full justify-center" onClick={() => void run()} disabled={running}>
            {running ? "Evaluating…" : persist ? "Run payment" : "Preview decision"}
          </button>
          <p className="text-xs text-[var(--text-faint)]">
            Runs the real <span className="font-mono">evaluateEnhancedPayment</span> policy engine before any
            settlement — same code an autonomous agent would hit.
          </p>
        </div>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <Reveal key={runCount}>
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text)]">Decision</h3>
              {d && <StatusBadge allowed={d.allowed} />}
            </div>
            {!d ? (
              <p className="text-sm text-[var(--text-faint)]">Run a payment to see the policy decision here.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Outcome</span>
                  <ReasonChip reason={d.reason} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Risk score</span>
                  {d.riskScore != null ? (
                    <span className="font-mono text-[var(--text-secondary)]">
                      <CountUp to={d.riskScore} format={(n) => Math.round(n).toString()} /> / 100
                    </span>
                  ) : (
                    <RiskPill score={null} />
                  )}
                </div>
                {d.riskFactors?.length ? (
                  <div>
                    <div className="mb-1 text-[var(--text-muted)]">Risk factors</div>
                    <ul className="space-y-1">
                      {d.riskFactors.map((f) => (
                        <li key={f.scorer} className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-1.5">
                          <span className="text-[var(--text-muted)]">{f.scorer}</span>
                          <span className="tabular-nums text-[var(--text-faint)]">
                            {f.score} × {f.weight}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {d.frequencyUsage && (
                  <div className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">
                    {d.frequencyUsage.currentCount}/{d.frequencyUsage.maxCount} payments in the last{" "}
                    {Math.round(d.frequencyUsage.windowMs / 1000)}s
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-[var(--text-faint)]">Spent</div>
                    <div className="tabular-nums font-semibold text-[var(--text-secondary)]">{money(d.spent.amount, d.spent.currency)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-faint)]">Remaining</div>
                    <div className="tabular-nums font-semibold text-[var(--text-secondary)]">{money(d.remaining.amount, d.remaining.currency)}</div>
                  </div>
                </div>
                {result?.persisted && result.transactionHash && (
                  <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
                    <span className="text-[var(--text-muted)]">Settlement</span>
                    <span className="font-mono text-xs text-[var(--text-muted)]">{result.transactionHash}</span>
                  </div>
                )}
                {result?.persisted === false && (
                  <p className="text-xs text-[var(--text-faint)]">Dry-run — nothing was recorded.</p>
                )}

                {explanation && (
                  <div className="mt-3 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text)]">{explanation.title}</span>
                      <span className="rounded-md bg-[var(--surface-3)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-muted)]">why?</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{explanation.summary}</p>
                    <ul className="mt-2 space-y-1 text-xs text-[var(--text-faint)]">
                      {explanation.detail.map((line, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[var(--text-faint)]">•</span>
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
            <ul className="divide-y divide-[var(--border)] text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between px-5 py-2.5 transition-colors hover:bg-[var(--surface-2)]">
                  <span className="text-xs text-[var(--text-faint)]">{fmtTime(h.at)}</span>
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {money(h.amount, displayCurrency)} → {h.merchant}
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge allowed={h.allowed} />
                    <span className="font-mono text-xs text-[var(--text-faint)]">{h.reason}</span>
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
