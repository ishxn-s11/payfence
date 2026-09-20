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
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--brand)]" />
          Loading…
        </div>
      </div>
    );
  }

  const statusTone =
    grant.status === "active" ? "bg-green-50 text-green-700" : "bg-[var(--surface-2)] text-[var(--text-muted)]";

  return (
    <Reveal>
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">{grant.agentName}</h1>
            <span className={`chip ${statusTone}`}>{grant.status}</span>
          </div>
          <p className="mt-0.5 font-mono text-xs text-[var(--text-faint)]">{grant.id}</p>
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
          <button className="btn btn-ghost text-red-600 hover:bg-red-50" onClick={() => void remove()}>
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Budget & usage" className="lg:col-span-2">
          <BudgetMeter
            percent={usage.percentUsed}
            currency={usage.currency}
            spent={usage.spent}
            total={grant.totalBudget.amount}
          />
          <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs text-[var(--text-faint)]">Remaining</div>
              <div className="mt-0.5 tabular-nums font-semibold text-[var(--text-secondary)]">
                {money(usage.remaining, usage.currency)}
              </div>
            </div>
            {grant.perPaymentLimit && (
              <div>
                <div className="text-xs text-[var(--text-faint)]">Per-payment limit</div>
                <div className="mt-0.5 tabular-nums font-semibold text-[var(--text-secondary)]">
                  {money(grant.perPaymentLimit.amount, grant.perPaymentLimit.currency)}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-[var(--text-faint)]">Merchants allowlisted</div>
              <div className="mt-0.5 font-semibold text-[var(--text-secondary)]">{grant.allowedMerchants?.length ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-faint)]">Purposes allowlisted</div>
              <div className="mt-0.5 font-semibold text-[var(--text-secondary)]">{grant.allowedPurposes?.length ?? 0}</div>
            </div>
          </div>
          {usage.frequency.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">Rate-limit usage</div>
              {usage.frequency.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">
                    ≤{f.max}/{windowLabel(f.windowMs)}
                  </span>
                  <span className={`tabular-nums font-semibold ${f.current >= f.max ? "text-red-600" : "text-[var(--text-secondary)]"}`}>
                    {f.current} / {f.max} used
                  </span>
                </div>
              ))}
            </div>
          )}
          {usage.rolling.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">Rolling-window usage</div>
              {usage.rolling.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">
                    {money(r.spent, usage.currency)} spent in {windowLabel(r.windowMs)}
                  </span>
                  <span className="tabular-nums font-semibold text-[var(--text-secondary)]">{money(r.max, usage.currency)} limit</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent attempts">
          {attempts.length ? (
            <ul className="divide-y divide-[var(--border)] text-sm">
              {attempts.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="font-mono text-xs text-[var(--text-muted)]">{a.merchant}</div>
                    <div className="mt-0.5 text-xs text-[var(--text-faint)]">{fmtRel(a.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskPill score={a.riskScore} />
                    <StatusBadge allowed={a.allowed} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-faint)]">No attempts for this grant yet. Try the Simulator.</p>
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
