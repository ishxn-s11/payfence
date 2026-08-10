"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Agent, GrantUsage, PaymentAttempt } from "@/types/dashboard";
import { fmtTime, money } from "@/lib/format";
import { Card, EmptyState, ReasonChip, RiskPill, StatusBadge, TxHash } from "@/components/ui";
import { Reveal } from "@/components/motion";

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [agentId] = useState<string>(String(id));
  const [agent, setAgent] = useState<Agent | null>(null);
  const [grants, setGrants] = useState<GrantUsage[]>([]);
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [aRes, gRes, pRes] = await Promise.all([
          api<{ agents: Agent[] }>("/api/agents"),
          api<{ grants: GrantUsage[] }>(`/api/grants?withUsage=true&agentId=${agentId}`),
          api<{ attempts: PaymentAttempt[] }>(`/api/payments?agentId=${agentId}&limit=20`),
        ]);
        setAgent(aRes.agents.find((a) => a.id === agentId) ?? null);
        setGrants(gRes.grants);
        setAttempts(pRes.attempts);
      } finally {
        setLoading(false);
      }
    })();
  }, [agentId]);

  async function remove() {
    await api(`/api/agents/${agentId}`, { method: "DELETE" });
    router.push("/agents");
  }

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading…</div>;
  if (!agent) return <EmptyState title="Agent not found" />;

  const denied = attempts.filter((a) => !a.allowed).length;

  return (
    <Reveal>
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{agent.name}</h1>
            <span className="chip bg-brand-50 text-brand-700">{grants.length} grant(s)</span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{agent.description || "No description"}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm text-slate-500">
            <span>
              Attempts <span className="tabular-nums text-slate-700">{attempts.length}</span>
            </span>
            <span>
              Denied <span className="tabular-nums text-red-600">{denied}</span>
            </span>
            <span>
              Enrolled{" "}
              <span className="tabular-nums text-slate-700">{fmtTime(agent.createdAt)}</span>
            </span>
          </div>
        </div>
        <button className="btn btn-ghost text-red-600" onClick={() => void remove()}>
          Delete agent
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Grants</h2>
        {grants.length === 0 ? (
          <EmptyState
            title="No grants for this agent"
            hint="Create a grant to give this agent spend authority under a policy."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {grants.map((u) => (
              <div key={u.grant.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-400">{u.grant.id}</span>
                  <span className={`chip ${u.grant.status === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {u.grant.status}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  <span className="tabular-nums">{money(u.spent, u.currency)}</span> / {money(u.grant.totalBudget.amount, u.currency)} spent
                  <span className="text-slate-400"> · {u.percentUsed}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, u.percentUsed)}%`, background: "#2a78d6" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card title="Payment history">
        {attempts.length === 0 ? (
          <p className="text-sm text-slate-400">No payments recorded for this agent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Merchant</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2 text-right">Risk</th>
                  <th className="px-3 py-2">TX</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50">
                    <td className="px-3 py-1.5 text-slate-500">{fmtTime(a.createdAt)}</td>
                    <td className="px-3 py-1.5 font-mono text-xs text-slate-600">{a.merchant}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{money(a.amount, a.currency)}</td>
                    <td className="px-3 py-1.5">
                      <StatusBadge allowed={a.allowed} />
                    </td>
                    <td className="px-3 py-1.5">
                      <ReasonChip reason={a.reason} />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <RiskPill score={a.riskScore} />
                    </td>
                    <td className="px-3 py-1.5">
                      <TxHash hash={a.transactionHash} />
                    </td>
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