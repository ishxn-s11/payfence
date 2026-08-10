"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { DashboardGrant } from "@/types/dashboard";
import { Simulator } from "@/components/simulator";
import { Reveal } from "@/components/motion";

export default function SimulatePage() {
  const [grants, setGrants] = useState<DashboardGrant[]>([]);

  useEffect(() => {
    api<{ grants: DashboardGrant[] }>("/api/grants?status=active")
      .then((d) => setGrants(d.grants))
      .catch(() => setGrants([]));
  }, []);

  return (
    <Reveal>
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Policy simulator</h1>
        <p className="text-sm text-slate-500">
          Craft a policy through the real engine — every rule, before settlement.
        </p>
      </div>
      {grants.length === 0 ? (
        <p className="text-sm text-slate-400">Create an active grant first, or load demo data.</p>
      ) : (
        <Simulator grants={grants} />
      )}
    </div>
    </Reveal>
  );
}