"use client";

import { useMemo } from "react";
import { type PaymentAttempt } from "@/types/dashboard";
import { money } from "@/lib/format";

interface PaymentChartsProps {
  attempts: PaymentAttempt[];
}

export function PaymentCharts({ attempts }: PaymentChartsProps) {
  const stats = useMemo(() => {
    const allowed = attempts.filter((a) => a.allowed);
    const denied = attempts.filter((a) => !a.allowed);
    const totalSpend = allowed.reduce((sum, a) => sum + parseFloat(a.amount) || 0, 0);
    const totalAttempts = attempts.length;
    const allowRate = totalAttempts > 0 ? Math.round((allowed.length / totalAttempts) * 100) : 0;

    // Spend by day for the chart
    const spendByDay = new Map<string, number>();
    for (const a of allowed) {
      const day = a.createdAt.slice(0, 10);
      spendByDay.set(day, (spendByDay.get(day) || 0) + (parseFloat(a.amount) || 0));
    }
    const days = Array.from(spendByDay.entries()).sort(([a], [b]) => a.localeCompare(b));
    const maxDaySpend = Math.max(...days.map(([, v]) => v), 1);

    // Spend by agent
    const spendByAgent = new Map<string, { name: string; spend: number; count: number; denied: number }>();
    for (const a of attempts) {
      const existing = spendByAgent.get(a.agentId) || { name: a.agentName, spend: 0, count: 0, denied: 0 };
      existing.count += 1;
      if (a.allowed) existing.spend += parseFloat(a.amount) || 0;
      else existing.denied += 1;
      spendByAgent.set(a.agentId, existing);
    }
    const agentData = Array.from(spendByAgent.values()).sort((a, b) => b.spend - a.spend);
    const maxAgentSpend = Math.max(...agentData.map((a) => a.spend), 1);

    // Denial reasons
    const reasons = new Map<string, number>();
    for (const a of denied) {
      reasons.set(a.reason, (reasons.get(a.reason) || 0) + 1);
    }
    const reasonData = Array.from(reasons.entries()).sort(([, a], [, b]) => b - a);

    return { allowed, denied, totalSpend, totalAttempts, allowRate, days, maxDaySpend, agentData, maxAgentSpend, reasonData };
  }, [attempts]);

  if (attempts.length === 0) return null;

  const chartH = 120;

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Total attempts</div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-[var(--text)]">{stats.totalAttempts}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Allowed</div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-green-700">{stats.allowed.length}</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">{stats.allowRate}% rate</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Denied</div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-red-600">{stats.denied.length}</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">{100 - stats.allowRate}% rate</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Total spent</div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-[var(--text)]">₹{stats.totalSpend.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Allow / Deny ratio — donut chart */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Allow / Deny ratio</div>
          <div className="mt-5 flex items-center gap-6">
            {/* Donut */}
            <div className="relative shrink-0">
              <svg width="120" height="120" viewBox="0 0 120 120">
                {/* Background ring */}
                <circle cx="60" cy="60" r="44" fill="none" stroke="var(--surface-2)" strokeWidth="11" />
                {/* Green segment (allowed) */}
                <circle
                  cx="60" cy="60" r="44" fill="none"
                  stroke="#34d399"
                  strokeWidth="11"
                  strokeDasharray={`${(stats.allowRate / 100) * 276.5} ${276.5}`}
                  strokeDashoffset="0"
                  strokeLinecap="butt"
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dasharray 0.6s ease-in-out" }}
                />
                {/* Red segment (denied) */}
                <circle
                  cx="60" cy="60" r="44" fill="none"
                  stroke="#f87171"
                  strokeWidth="11"
                  strokeDasharray={`${Math.max(((100 - stats.allowRate) / 100) * 276.5, 0)} ${276.5}`}
                  strokeDashoffset={`-${(stats.allowRate / 100) * 276.5}`}
                  strokeLinecap="butt"
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dasharray 0.6s ease-in-out, stroke-dashoffset 0.6s ease-in-out" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold tabular-nums tracking-tight text-[var(--text)]">{stats.allowRate}%</span>
                <span className="text-[0.5rem] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">allow rate</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-[0.9375rem] font-bold tabular-nums text-emerald-400">{stats.allowed.length}</span>
                <span className="text-[0.8125rem] text-[var(--text-muted)]">allowed</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-[0.9375rem] font-bold tabular-nums text-rose-400">{stats.denied.length}</span>
                <span className="text-[0.8125rem] text-[var(--text-muted)]">denied</span>
              </div>
              <div className="border-t border-[var(--border)] pt-2.5">
                <div className="flex h-1.5 overflow-hidden rounded-full transition-all duration-500">
                  <div className="bg-emerald-500 transition-all duration-500 ease-out" style={{ width: `${stats.allowRate}%` }} />
                  <div className="bg-rose-500 transition-all duration-500 ease-out" style={{ width: `${100 - stats.allowRate}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[0.625rem] text-[var(--text-faint)]">
                  <span>{stats.allowRate}% allowed</span>
                  <span>{100 - stats.allowRate}% denied</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spend by agent */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Spend by agent</div>
          <div className="mt-4 space-y-3">
            {stats.agentData.map((agent) => (
              <div key={agent.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-secondary)]">{agent.name}</span>
                  <span className="tabular-nums text-[var(--text-muted)]">₹{agent.spend.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--brand)] transition-all duration-500"
                    style={{ width: `${(agent.spend / stats.maxAgentSpend) * 100}%` }}
                  />
                </div>
                <div className="mt-0.5 text-[0.625rem] text-[var(--text-faint)]">
                  {agent.count} attempts · {agent.denied} denied
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Denial reasons */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Denial reasons</div>
          <div className="mt-4 space-y-3">
            {stats.reasonData.length > 0 ? stats.reasonData.map(([reason, count]) => (
              <div key={reason}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-secondary)]">{reason.replace(/_/g, " ")}</span>
                  <span className="tabular-nums font-bold text-[var(--text-muted)]">{count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all duration-500"
                    style={{ width: `${(count / stats.denied.length) * 100}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-xs text-[var(--text-faint)]">No denials</p>
            )}
          </div>
        </div>
      </div>

      {/* Spend over time (mini mountain chart) */}
      {stats.days.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Spend over time</div>
          <div className="mt-4" style={{ height: chartH }}>
            <svg viewBox={`0 0 600 ${chartH}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="pay-mountain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                <line
                  key={pct}
                  x1={0}
                  y1={chartH * (1 - pct)}
                  x2={600}
                  y2={chartH * (1 - pct)}
                  stroke="var(--border)"
                  strokeWidth={0.5}
                  strokeDasharray="4 4"
                />
              ))}
              {/* Area + line */}
              {(() => {
                const pts = stats.days.map(([day, val], i) => ({
                  x: (i / Math.max(stats.days.length - 1, 1)) * 600,
                  y: chartH - (val / stats.maxDaySpend) * (chartH - 10),
                }));
                let path = `M ${pts[0].x},${pts[0].y}`;
                for (let i = 1; i < pts.length; i++) {
                  const cpx = (pts[i - 1].x + pts[i].x) / 2;
                  path += ` C ${cpx},${pts[i - 1].y} ${cpx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
                }
                const area = `${path} L ${pts[pts.length - 1].x},${chartH} L ${pts[0].x},${chartH} Z`;
                return (
                  <>
                    <path d={area} fill="url(#pay-mountain)" />
                    <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinecap="round" />
                  </>
                );
              })()}
              {/* X labels */}
              {stats.days.filter((_, i) => i % Math.max(Math.floor(stats.days.length / 6), 1) === 0 || i === stats.days.length - 1).map(([day], i) => {
                const idx = stats.days.findIndex(([d]) => d === day);
                const x = (idx / Math.max(stats.days.length - 1, 1)) * 600;
                return (
                  <text key={i} x={x} y={chartH - 2} fill="var(--text-faint)" fontSize={9} textAnchor="middle">
                    {day.slice(5)}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
