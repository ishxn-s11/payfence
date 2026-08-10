"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Agent, DashboardGrant, GrantUsage, PaymentAttempt } from "@/types/dashboard";
import { fmtRel, money, windowLabel } from "@/lib/format";
import { BudgetMeter, Card, ReasonChip, RiskPill, StatusBadge, TxHash } from "@/components/ui";
import { GrantForm } from "@/components/grants";
import { Reveal } from "@/components/motion";

export default function GrantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [grantId] = useState<string>(String(id));
  const [grant, setGrant] = useState<DashboardGrant | null>(null);
  const [usage, setUsage] = useState<GrantUsage | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [{ grant: g, usage: u }, agentsRes, payRes] = await Promise.all([
        api<{ grant: DashboardGrant; usage: GrantUsage }>(`/api/grants/${grantId}`),
        api<{ agents: Agent[] }>("/api/agents"),
        api<{ attempts: PaymentAttempt[] }>(`/api/payments?grantId=${grantId}&limit=15`),
      ]);
      setGrant(g);
      setUsage(u);
      setAgents(agentsRes.agents);
      setAttempts(payRes.attempts);
    } finally {
      setLoading(false);
    }
  }, [grantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(status: "active" | "revoked") {
    await api(`/api/grants/${grantId}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await load();
  }

  async function remove() {
    await api(`/api/grants/${grantId}`, { method: "DELETE" });
    router.push("/grants");
  }

  if (loading || !grant || !usage) {
    return <div className="py-16 text-center text-sm text-slate-400">Loading…</div>;
  }

  const statusTone =
    grant.status === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500";

  return (
    <Reveal>
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{grant.agentName}</h1>
            <span className={`chip ${statusTone}`}>{grant.status}</span>
          </div>
          <p className="font-mono text-xs text-slate-400">{grant.id}</p>
        </div>
        <div className="flex gap-2">
          {grant.status === "active" ? (
            <button className="btn btn-secondary" onClick={() => void setStatus("revoked")}>
              Revoke
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => void setStatus("active")}>
              Activate
            </button>
          )}
          <button className="btn btn-ghost text-red-600" onClick={() => void remove()}>
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Budget & usage" className="lg:col-span-2">
          <BudgetMeter
            percent={usage.percentUsed}
            currency={usage.currency}
            spent={usage.spent}
            total={grant.totalBudget.amount}
          />
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-400">Remaining</div>
              <div className="tabular-nums text-slate-700">
                {money(usage.remaining, usage.currency)}
              </div>
            </div>
            {grant.perPaymentLimit && (
              <div>
                <div className="text-xs text-slate-400">Per-payment limit</div>
                <div className="tabular-nums text-slate-700">
                  {money(grant.perPaymentLimit.amount, grant.perPaymentLimit.currency)}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-400">Merchants allowlisted</div>
              <div className="text-slate-700">{grant.allowedMerchants?.length ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Purposes allowlisted</div>
              <div className="text-slate-700">{grant.allowedPurposes?.length ?? 0}</div>
            </div>
          </div>
          {usage.frequency.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 text-xs font-medium text-slate-500">Rate-limit usage</div>
              {usage.frequency.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    ≤{f.max}/{windowLabel(f.windowMs)}
                  </span>
                  <span className={`tabular-nums ${f.current >= f.max ? "text-red-600" : "text-slate-600"}`}>
                    {f.current} / {f.max} used
                  </span>
                </div>
              ))}
            </div>
          )}
          {usage.rolling.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 text-xs font-medium text-slate-500">Rolling-window usage</div>
              {usage.rolling.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    {money(r.spent, usage.currency)} spent in {windowLabel(r.windowMs)}
                  </span>
                  <span className="tabular-nums text-slate-600">{money(r.max, usage.currency)} limit</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent attempts">
          {attempts.length ? (
            <ul className="divide-y divide-slate-50 text-sm">
              {attempts.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <div className="font-mono text-xs text-slate-600">{a.merchant}</div>
                    <div className="text-xs text-slate-400">{fmtRel(a.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskPill score={a.riskScore} />
                    <StatusBadge allowed={a.allowed} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No attempts for this grant yet. Try the Simulator.</p>
          )}
        </Card>
      </div>

      <Card title={grant.status === "active" ? "Edit policy" : "Policy (currently inactive)"}>
        <GrantForm
          agents={agents}
          initial={grant}
          onSaved={() => void load()}
          onCancel={() => null}
        />
      </Card>
    </div>
    </Reveal>
  );
}