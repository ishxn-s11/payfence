"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { GrantUsage } from "@/types/dashboard";
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

  return (
    <Reveal>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Grants</h1>
            <p className="text-sm text-slate-500">
              Spending policies enforced for each agent before settlement. Amounts shown in INR.
            </p>
          </div>
          <Link href="/grants/new" className="btn btn-primary">
            + New grant
          </Link>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
        ) : grants.length === 0 ? (
          <EmptyState
            title="No grants yet"
            hint="A grant is the complete payment policy for an agent: budget, limits, allowlists, rate limits, rolling windows and risk rules."
            action={
              <Link href="/grants/new" className="btn btn-primary">
                + New grant
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {grants.map((g) => (
              <GrantCard key={g.grant.id} usage={g} />
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}