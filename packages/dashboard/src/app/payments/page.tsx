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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500">
          Live feed of every payment attempt and its policy decision — before and after settlement.
        </p>
      </div>
      <PaymentFeed agents={agents} />
    </div>
    </Reveal>
  );
}