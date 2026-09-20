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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--brand)]" />
          Loading…
        </div>
      </div>
    );
  }
  if (!agent) return <EmptyState title="Agent not found" />;

  const denied = attempts.filter((a) => !a.allowed).length;

  return (
    <Reveal>
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">{agent.name}</h1>
            <span className="chip bg-brand-50 text-brand-700">{grants.length} grant(s)</span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{agent.description || "No description"}</p>
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-0.5 text-sm text-[var(--text-muted)] sm:grid-cols-2">
            <span>
              Attempts <span className="tabular-nums font-semibold text-[var(--text-secondary)]">{attempts.length}</span>
            </span>
            <span>
              Denied <span className="tabular-nums font-semibold text-red-600">{denied}</span>
            </span>
            <span>
              Enrolled{" "}
              <span className="tabular-nums text-[var(--text-secondary)]">{fmtTime(agent.createdAt)}</span>
            </span>
          </div>
        </div>
        <button className="btn btn-ghost text-red-600 hover:bg-red-50" onClick={() => void remove()}>
          Delete agent
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">Grants</h2>
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
                  <span className="font-mono text-xs text-[var(--text-faint)]">{u.grant.id}</span>
                  <span className={`chip ${u.grant.status === "active" ? "bg-green-50 text-green-700" : "bg-[var(--surface-2)] text-[var(--text-muted)]"}`}>
                    {u.grant.status}
                  </span>
                </div>
                <div className="mt-2 text-sm text-[var(--text-muted)]">
                  <span className="tabular-nums font-semibold text-[var(--text-secondary)]">{money(u.spent, u.currency)}</span> / {money(u.grant.totalBudget.amount, u.currency)} spent
                  <span className="text-[var(--text-faint)]"> · {u.percentUsed}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, u.percentUsed)}%`, background: "#3b82f6" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card title="Payment history">
        {attempts.length === 0 ? (
          <p className="text-sm text-[var(--text-faint)]">No payments recorded for this agent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--text-faint)]">
                  <th className="px-4 py-2.5 font-semibold">Time</th>
                  <th className="px-4 py-2.5 font-semibold">Merchant</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Reason</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Risk</th>
                  <th className="px-4 py-2.5 font-semibold">TX</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)]">
                    <td className="px-4 py-2 text-[var(--text-muted)]">{fmtTime(a.createdAt)}</td>
                    <td className="px-4 py-2 font-mono text-xs text-[var(--text-muted)]">{a.merchant}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-[var(--text-secondary)]">{money(a.amount, a.currency)}</td>
                    <td className="px-4 py-2">
                      <StatusBadge allowed={a.allowed} />
                    </td>
                    <td className="px-4 py-2">
                      <ReasonChip reason={a.reason} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <RiskPill score={a.riskScore} />
                    </td>
                    <td className="px-4 py-2">
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
