"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { PaymentAttempt, GrantUsage } from "@/types/dashboard";
import { fmtTime, inrAmount, money } from "@/lib/format";
import { fmtInr } from "@/lib/currency";
import { STATUS } from "@/lib/colors";
import { BarChart, Card, EmptyState, ReasonChip, RiskPill, StatCard, StatusBadge } from "@/components/ui";
import { Reveal, ScrollReveal } from "@/components/motion";
import {
  AboutSection,
  FeasibilitySection,
  HeroSection,
  RulePipelineSection,
  SplashSection,
  UseCasesSection,
} from "@/components/overview";

interface AnalyticsData {
  summary: {
    agentCount: number;
    activeGrantCount: number;
    totalSpent: string;
    currency: string;
    allowedAttempts: number;
    deniedAttempts: number;
    settledCount: number;
    attempts: number;
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

export default function OverviewPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [grants, setGrants] = useState<GrantUsage[]>([]);
  const [recent, setRecent] = useState<PaymentAttempt[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [spendYear, setSpendYear] = useState(now.getFullYear());
  const [spendMonth, setSpendMonth] = useState(now.getMonth() + 1);

  const load = useCallback(async () => {
    try {
      const [analytics, grantRes, paymentRes] = await Promise.all([
        api<AnalyticsData>("/api/analytics"),
        api<{ grants: GrantUsage[] }>("/api/grants?withUsage=true"),
        api<{ attempts: PaymentAttempt[] }>("/api/payments?limit=6"),
      ]);
      setData(analytics);
      setGrants(grantRes.grants);
      setRecent(paymentRes.attempts);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSpendMonth = useCallback(async (year: number, month: number) => {
    try {
      const analytics = await api<AnalyticsData>(`/api/analytics?year=${year}&month=${month}`);
      setData((prev) => (prev ? { ...prev, spendSeries: analytics.spendSeries } : prev));
    } catch { /* ignore */ }
  }, []);

  const initialLoadDone = useRef(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (initialLoadDone.current) {
      void loadSpendMonth(spendYear, spendMonth);
    }
  }, [spendYear, spendMonth, loadSpendMonth]);

  useEffect(() => {
    if (data && !initialLoadDone.current) {
      initialLoadDone.current = true;
      void loadSpendMonth(spendYear, spendMonth);
    }
  }, [data, spendYear, spendMonth, loadSpendMonth]);

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

  async function seed() {
    setSeeding(true);
    try {
      await api("/api/seed", { method: "POST" });
      await load();
    } finally {
      setSeeding(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--brand)]" />
          Loading…
        </div>
      </div>
    );
  }

  const s = data.summary;
  const empty = s.attempts === 0;
  const denialRate = s.attempts > 0 ? Math.round((s.deniedAttempts / s.attempts) * 100) : 0;

  return (
    <>
      <Reveal>
        <div className="space-y-16">
          <SplashSection />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">Overview</h1>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--text-muted)]">
                Org-wide view of autonomous agent spending and policy enforcement. Amounts shown in INR.
              </p>
            </div>
            <button className="btn btn-secondary text-sm shrink-0" onClick={() => void seed()} disabled={seeding}>
              {seeding ? "Seeding…" : "Reset demo data"}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
            <StatCard
              label="Total spent (INR)"
              value={money(s.totalSpent, s.currency)}
              sub={`${s.settledCount} settled payments`}
              animate={{ to: inrAmount(s.totalSpent), format: (n) => `₹${fmtInr(n)}` }}
            />
            <StatCard
              label="Denial rate"
              value={`${denialRate}%`}
              sub={`${s.deniedAttempts} of ${s.attempts} attempts blocked`}
              tone={denialRate > 20 ? STATUS.critical : undefined}
              animate={{ to: denialRate, format: (n) => `${Math.round(n)}%` }}
            />
            <StatCard label="Agents" value={String(s.agentCount)} sub="enrolled" animate={{ to: s.agentCount }} />
            <StatCard label="Active grants" value={String(s.activeGrantCount)} sub="with policies" animate={{ to: s.activeGrantCount }} />
            <StatCard label="Attempts (14d)" value={String(s.attempts)} sub={`${s.allowedAttempts} allowed`} animate={{ to: s.attempts }} />
          </div>

          {empty ? (
            <EmptyState
              title="No data yet"
              hint="Load demo data to see agents, grants and the policy engine in action — including real deny decisions from frequency, rolling-budget and risk rules."
              action={
                <button className="btn btn-primary" onClick={() => void seed()} disabled={seeding}>
                  Load demo data
                </button>
              }
            />
          ) : null}

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
              {data.spendSeries.length ? (
                <BarChart data={data.spendSeries} height={220} />
              ) : (
                <p className="text-sm text-[var(--text-faint)]">No spend recorded for this month.</p>
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
                      <span className="text-[0.9375rem] tabular-nums font-bold text-[var(--text-secondary)]">{money(m.value, s.currency)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--text-faint)]">No spend yet.</p>
              )}
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Active grants">
              {grants.length ? (
                <ul className="space-y-3">
                  {grants.slice(0, 6).map((u) => (
                    <li key={u.grant.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-5 py-4 transition-colors hover:border-[var(--border-strong)]">
                      <div>
                        <div className="text-[0.9375rem] font-bold text-[var(--text-secondary)]">{u.grant.agentName}</div>
                        <div className="mt-1 font-mono text-xs text-[var(--text-faint)]">{u.grant.id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[0.9375rem] tabular-nums font-bold text-[var(--text-secondary)]">
                          {money(u.spent, u.currency)} / {money(u.grant.totalBudget.amount, u.currency)}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-faint)]">{u.percentUsed}% used</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--text-faint)]">No grants yet.</p>
              )}
            </Card>
            <Card title="Recent payment attempts">
              {recent.length ? (
                <ul className="divide-y divide-[var(--border)]">
                  {recent.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[0.9375rem] font-bold text-[var(--text-secondary)]">{a.agentName}</div>
                        <div className="mt-1 truncate font-mono text-xs text-[var(--text-faint)]">{a.merchant}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className="text-[0.875rem] tabular-nums font-semibold text-[var(--text-muted)]">{money(a.amount, a.currency)}</span>
                        <RiskPill score={a.riskScore} />
                        <StatusBadge allowed={a.allowed} />
                        <ReasonChip reason={a.reason} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--text-faint)]">No activity yet.</p>
              )}
              <div className="mt-3 text-xs text-[var(--text-faint)]">latest: {recent[0] ? fmtTime(recent[0].createdAt) : "—"}</div>
            </Card>
          </div>
        </div>
      </Reveal>

      {/* LinusBio-style gradient wash divider */}
      <div className="relative my-20">
        <div className="absolute inset-0 flex items-center">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--brand)]/20 to-transparent" />
        </div>
        <div className="relative flex justify-center">
          <span className="glass rounded-full px-6 py-2 text-[0.6875rem] font-bold uppercase tracking-[0.25em] text-[var(--text-faint)]">
            About Pay-Fence
          </span>
        </div>
      </div>

      <div className="space-y-28">
        <ScrollReveal className="gradient-wash">
          <HeroSection />
        </ScrollReveal>
        <ScrollReveal>
          <div className="section-wash-purple rounded-3xl px-6 py-12 sm:px-10">
            <AboutSection />
          </div>
        </ScrollReveal>
        <ScrollReveal className="gradient-wash">
          <RulePipelineSection />
        </ScrollReveal>
        <ScrollReveal>
          <div className="section-wash-blue rounded-3xl px-6 py-12 sm:px-10">
            <UseCasesSection />
          </div>
        </ScrollReveal>
        <ScrollReveal className="gradient-wash">
          <FeasibilitySection />
        </ScrollReveal>
      </div>
    </>
  );
}
