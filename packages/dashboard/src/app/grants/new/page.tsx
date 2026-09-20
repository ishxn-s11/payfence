"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Agent, DashboardGrant } from "@/types/dashboard";
import { GrantForm } from "@/components/grants";
import { Card } from "@/components/ui";
import { Reveal } from "@/components/motion";

export default function NewGrantPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    api<{ agents: Agent[] }>("/api/agents")
      .then((d) => setAgents(d.agents))
      .catch(() => setAgents([]));
  }, []);

  return (
    <Reveal>
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">New grant</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Define the full payment policy — budget, limits, allowlists, rate limits, rolling windows and risk rules.
        </p>
      </div>
      <Card>
        <GrantForm
          agents={agents}
          onSaved={(g: DashboardGrant) => router.push(`/grants/${g.id}`)}
          onCancel={() => router.push("/grants")}
        />
      </Card>
    </div>
    </Reveal>
  );
}
