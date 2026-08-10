"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { PaymentAttempt, GrantUsage } from "@/types/dashboard";
import { fmtTime, inrAmount, money } from "@/lib/format";
import { fmtInr } from "@/lib/currency";
import { STATUS } from "@/lib/colors";
import { Card, EmptyState, ReasonChip, RiskPill, StatCard, StatusBadge } from "@/components/ui";
import { Reveal, ScrollReveal } from "@/components/motion";
import {
  AboutSection,
  FeasibilitySection,
  HeroSection,
  RulePipelineSection,
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

export default function OverviewPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [grants, setGrants] = useState<GrantUsage[]>([]);
  const [recent, setRecent] = useState<PaymentAttempt[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    void load();
  }, [load]);

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
    return <div className="py-16 text-center text-sm text-slate-400">Loading…</div>;
  }

  const s = data.summary;
  const empty = s.attempts === 0;
  const denialRate = s.attempts > 0 ? Math.round((s.deniedAttempts / s.attempts) * 100) : 0;

  return (
    <>
      <Reveal>
        <div className="space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
            <p className="text-sm text-slate-500">
              Org-wide view of autonomous agent spending and policy enforcement. Amounts shown in INR.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => void seed()} disabled={seeding}>
            {seeding ? "Seeding…" : "Reset demo data"}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Spend over time (INR)">
            {data.spendSeries.length ? (
              <ul className="space-y-1.5">
                {data.spendSeries.map((p) => (
                  <li key={p.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{p.label}</span>
                    <span className="tabular-nums text-slate-700">{money(p.value, s.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No spend recorded.</p>
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
                    <span className="tabular-nums text-slate-700">{money(m.value, s.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No spend yet.</p>
            )}
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Active grants">
            {grants.length ? (
              <ul className="space-y-2">
                {grants.slice(0, 6).map((u) => (
                  <li key={u.grant.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{u.grant.agentName}</div>
                      <div className="font-mono text-xs text-slate-400">{u.grant.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm tabular-nums text-slate-700">
                        {money(u.spent, u.currency)} / {money(u.grant.totalBudget.amount, u.currency)}
                      </div>
                      <div className="text-xs text-slate-400">{u.percentUsed}% used</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No grants yet.</p>
            )}
          </Card>
          <Card title="Recent payment attempts">
            {recent.length ? (
              <ul className="divide-y divide-slate-50 text-sm">
                {recent.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium text-slate-700">{a.agentName}</div>
                      <div className="font-mono text-xs text-slate-400">{a.merchant}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-slate-500">{money(a.amount, a.currency)}</span>
                      <RiskPill score={a.riskScore} />
                      <StatusBadge allowed={a.allowed} />
                      <ReasonChip reason={a.reason} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No activity yet.</p>
            )}
            <div className="mt-1 text-xs text-slate-400">latest: {recent[0] ? fmtTime(recent[0].createdAt) : "—"}</div>
          </Card>
        </div>
      </div>
    </Reveal>

    <div className="space-y-14 pt-10">
      <ScrollReveal>
        <HeroSection />
      </ScrollReveal>
      <ScrollReveal>
        <AboutSection />
      </ScrollReveal>
      <ScrollReveal>
        <RulePipelineSection />
      </ScrollReveal>
      <ScrollReveal>
        <UseCasesSection />
      </ScrollReveal>
      <ScrollReveal>
        <FeasibilitySection />
      </ScrollReveal>
    </div>
    </>
  );
}