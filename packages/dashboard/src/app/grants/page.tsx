"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import type { GrantUsage } from "@/types/dashboard";
import { money } from "@/lib/format";
import { GrantCard } from "@/components/grants";
import { EmptyState } from "@/components/ui";
import { Reveal } from "@/components/motion";

export default function GrantsPage() {
  const [grants, setGrants] = useState<GrantUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ grants: GrantUsage[] }>("/api/grants?withUsage=true")
      .then((d) => setGrants(d.grants))
      .catch(() => setGrants([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const active = grants.filter((g) => g.grant.status === "active");
    const totalBudget = grants.reduce((sum, g) => sum + (parseFloat(g.grant.totalBudget.amount) || 0), 0);
    const totalSpent = grants.reduce((sum, g) => sum + (parseFloat(g.spent) || 0), 0);
    const avgUsage = grants.length > 0 ? Math.round(grants.reduce((sum, g) => sum + g.percentUsed, 0) / grants.length) : 0;
    return { active: active.length, totalBudget, totalSpent, avgUsage };
  }, [grants]);

  return (
    <Reveal>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">Grants</h1>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--text-muted)]">
              Spending policies enforced for each agent before settlement. Amounts shown in INR.
            </p>
          </div>
          <Link href="/grants/new" className="btn btn-primary text-sm shrink-0">
            + New grant
          </Link>
        </div>

        {/* Summary stats */}
        {!loading && grants.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Total grants</div>
              <div className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-[var(--text)]">{grants.length}</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">{stats.active} active</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Total budget</div>
              <div className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-[var(--text)]">₹{stats.totalBudget.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Total spent</div>
              <div className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-[var(--text)]">₹{stats.totalSpent.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">Avg usage</div>
              <div className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-[var(--text)]">{stats.avgUsage}%</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--brand)]" />
              Loading…
            </div>
          </div>
        ) : grants.length === 0 ? (
          <EmptyState
            title="No grants yet"
            hint="A grant is the complete payment policy for an agent: budget, limits, allowlists, rate limits, rolling windows and risk rules."
            action={
              <Link href="/grants/new" className="btn btn-primary text-sm">
                + New grant
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {grants.map((g) => (
              <GrantCard key={g.grant.id} usage={g} />
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}
