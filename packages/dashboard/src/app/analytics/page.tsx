"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { money } from "@/lib/format";
import { BarChart, Card } from "@/components/ui";
import { Reveal } from "@/components/motion";

interface AnalyticsData {
  summary: {
    totalSpent: string;
    currency: string;
    attempts: number;
    allowedAttempts: number;
    deniedAttempts: number;
    settledCount: number;
  };
  spendSeries: { label: string; value: string }[];
  denials: { label: string; count: number }[];
  riskDistribution: { label: string; count: number }[];
  topMerchants: { merchant: string; value: string }[];
  agentActivity: { agentId: string; name: string; attempts: number; allowed: number; denied: number; spent: string }[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const now = new Date();
  const [spendYear, setSpendYear] = useState(now.getFullYear());
  const [spendMonth, setSpendMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    api<AnalyticsData>("/api/analytics")
      .then(setData)
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    if (!data) return;
    api<AnalyticsData>(`/api/analytics?year=${spendYear}&month=${spendMonth}`)
      .then((d) => setData((prev) => (prev ? { ...prev, spendSeries: d.spendSeries } : d)))
      .catch(() => {});
  }, [spendYear, spendMonth, data === null]);

  function prevMonth() {
    setSpendMonth((m) => {
      if (m === 1) { setSpendYear((y) => y - 1); return 12; }
      return m - 1;
    });
  }
  function nextMonth() {
    setSpendMonth((m) => {
      if (m === 12) { setSpendYear((y) => y + 1); return 1; }
      return m + 1;
    });
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--brand)]" />
          Loading…
        </div>
      </div>
    );
  }

  const hasData = data.summary.attempts > 0;

  return (
    <Reveal>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">Analytics</h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--text-muted)]">
            Where the money went, what got blocked, and why. Amounts in INR.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card
            title="Spend over time (INR)"
            action={
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost px-2 py-1 text-xs" onClick={prevMonth}>
                  ←
                </button>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  {MONTH_NAMES[spendMonth - 1]} {spendYear}
                </span>
                <button className="btn btn-ghost px-2 py-1 text-xs" onClick={nextMonth}>
                  →
                </button>
              </div>
            }
          >
            {hasData ? (
              <BarChart data={data.spendSeries} height={220} />
            ) : (
              <p className="text-sm text-[var(--text-faint)]">No data for this month.</p>
            )}
          </Card>
          <Card title="Denied payments by rule">
            {data.denials.length ? (
              <ul className="space-y-2.5">
                {data.denials.map((d) => (
                  <li key={d.label} className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-[var(--surface-2)]">
                    <span className="text-[0.875rem] text-[var(--text-muted)]">{d.label}</span>
                    <span className="text-[0.9375rem] tabular-nums font-bold text-[var(--text-secondary)]">{d.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--text-faint)]">No denials recorded.</p>
            )}
          </Card>
          <Card title="Risk score distribution">
            {data.riskDistribution.some((d) => d.count > 0) ? (
              <ul className="space-y-2.5">
                {data.riskDistribution.map((d) => (
                  <li key={d.label} className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-[var(--surface-2)]">
                    <span className="text-[0.875rem] text-[var(--text-muted)]">{d.label}</span>
                    <span className="text-[0.9375rem] tabular-nums font-bold text-[var(--text-secondary)]">{d.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--text-faint)]">No risk-scored payments yet.</p>
            )}
          </Card>
          <Card title="Top merchants by spend (INR)">
            {data.topMerchants.length ? (
              <ul className="space-y-2.5">
                {data.topMerchants.map((m) => (
                  <li key={m.merchant} className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-[var(--surface-2)]">
                    <span className="text-[0.875rem] text-[var(--text-muted)]">{m.merchant}</span>
                    <span className="text-[0.9375rem] tabular-nums font-bold text-[var(--text-secondary)]">{money(m.value, "USDC")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--text-faint)]">No spend yet.</p>
            )}
          </Card>
        </div>

        <Card title="Agent activity">
          {data.agentActivity.length === 0 ? (
            <p className="text-sm text-[var(--text-faint)]">No agent activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[0.875rem]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--text-faint)]">
                    <th className="px-5 py-3 font-semibold">Agent</th>
                    <th className="px-5 py-3 text-right font-semibold">Attempts</th>
                    <th className="px-5 py-3 text-right font-semibold">Allowed</th>
                    <th className="px-5 py-3 text-right font-semibold">Denied</th>
                    <th className="px-5 py-3 text-right font-semibold">Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agentActivity.map((a) => (
                    <tr key={a.agentId} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)]">
                      <td className="px-5 py-3.5 text-[0.9375rem] font-semibold text-[var(--text-secondary)]">{a.name}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-[var(--text-muted)]">{a.attempts}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-green-700">{a.allowed}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-red-600">{a.denied}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums font-bold text-[var(--text-secondary)]">{money(a.spent, "USDC")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Reveal>
  );
}
