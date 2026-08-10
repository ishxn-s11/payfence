"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { money } from "@/lib/format";
import { Card } from "@/components/ui";
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

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    api<AnalyticsData>("/api/analytics").then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <div className="py-16 text-center text-sm text-slate-400">Loading…</div>;

  const hasData = data.summary.attempts > 0;

  return (
    <Reveal>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">
            Where the money went, what got blocked, and why. Amounts in INR.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Spend over time (INR)">
            {hasData ? (
              <ul className="space-y-1.5">
                {data.spendSeries.map((p) => (
                  <li key={p.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{p.label}</span>
                    <span className="tabular-nums text-slate-700">{money(p.value, "USDC")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No data. Load demo data on the Overview page.</p>
            )}
          </Card>
          <Card title="Denied payments by rule">
            {data.denials.length ? (
              <ul className="space-y-1.5">
                {data.denials.map((d) => (
                  <li key={d.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{d.label}</span>
                    <span className="tabular-nums text-slate-700">{d.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No denials recorded.</p>
            )}
          </Card>
          <Card title="Risk score distribution">
            {data.riskDistribution.some((d) => d.count > 0) ? (
              <ul className="space-y-1.5">
                {data.riskDistribution.map((d) => (
                  <li key={d.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{d.label}</span>
                    <span className="tabular-nums text-slate-700">{d.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No risk-scored payments yet.</p>
            )}
          </Card>
          <Card title="Top merchants by spend (INR)">
            {data.topMerchants.length ? (
              <ul className="space-y-1.5">
                {data.topMerchants.map((m) => (
                  <li key={m.merchant} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{m.merchant}</span>
                    <span className="tabular-nums text-slate-700">{money(m.value, "USDC")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No spend yet.</p>
            )}
          </Card>
        </div>

        <Card title="Agent activity">
          {data.agentActivity.length === 0 ? (
            <p className="text-sm text-slate-400">No agent activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2">Agent</th>
                    <th className="px-3 py-2 text-right">Attempts</th>
                    <th className="px-3 py-2 text-right">Allowed</th>
                    <th className="px-3 py-2 text-right">Denied</th>
                    <th className="px-3 py-2 text-right">Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agentActivity.map((a) => (
                    <tr key={a.agentId} className="border-b border-slate-50">
                      <td className="px-3 py-1.5 font-medium text-slate-700">{a.name}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{a.attempts}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-green-700">{a.allowed}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-red-600">{a.denied}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{money(a.spent, "USDC")}</td>
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