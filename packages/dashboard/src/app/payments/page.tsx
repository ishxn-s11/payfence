"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Agent } from "@/types/dashboard";
import { PaymentFeed } from "@/components/payments";
import { Reveal } from "@/components/motion";

export default function PaymentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    api<{ agents: Agent[] }>("/api/agents")
      .then((d) => setAgents(d.agents))
      .catch(() => setAgents([]));
  }, []);

  return (
    <Reveal>
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">Payments</h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--text-muted)]">
          Live feed of every payment attempt and its policy decision — before and after settlement.
        </p>
      </div>
      <PaymentFeed agents={agents} />
    </div>
    </Reveal>
  );
}
