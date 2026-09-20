"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { api } from "@/lib/client";
import type { Agent, PaymentAttempt } from "@/types/dashboard";
import { fmtTime } from "@/lib/format";
import { money } from "@/lib/format";
import { explainDecision, type DecisionExplanation } from "@/lib/explain";
import { EmptyState, ReasonChip, RiskPill, StatusBadge, TxHash } from "@/components/ui";
import { prefersReducedMotion } from "@/components/motion";
import { PaymentCharts } from "./PaymentCharts";

interface Filters {
  agentId: string;
  allowed: string;
  q: string;
}

export function PaymentFeed({
  agents,
  onChanged,
}: {
  agents: Agent[];
  onChanged?: () => void;
}) {
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [filters, setFilters] = useState<Filters>({ agentId: "", allowed: "", q: "" });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.agentId) params.set("agentId", filters.agentId);
    if (filters.allowed) params.set("allowed", filters.allowed);
    if (filters.q) params.set("merchant", filters.q);
    params.set("limit", "60");
    try {
      const data = await api<{ attempts: PaymentAttempt[] }>(`/api/payments?${params}`);
      setAttempts(data.attempts);
    } catch {
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
    timer.current = setInterval(() => void load(), 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  // Animate newly shown rows in (on filter/refresh).
  useEffect(() => {
    const rows = bodyRef.current?.querySelectorAll<HTMLTableRowElement>("tr[data-row]");
    if (!rows || !rows.length || prefersReducedMotion()) return;
    rows.forEach((r) => {
      r.style.opacity = "0";
      r.style.transform = "translateY(6px)";
    });
    const anim = animate(rows as never, {
      opacity: [0, 1],
      translateY: [6, 0],
      duration: 420,
      easing: "outExpo",
      delay: stagger(28),
    });
    return () => {
      anim.pause();
    };
  }, [attempts]);

  async function seed() {
    setSeeding(true);
    try {
      await api("/api/seed", { method: "POST" });
      await load();
      onChanged?.();
    } finally {
      setSeeding(false);
    }
  }

  const statusCount = (allowed: boolean) => attempts.filter((a) => a.allowed === allowed).length;

  return (
    <div className="space-y-5">
      {/* Summary charts */}
      {attempts.length > 0 && <PaymentCharts attempts={attempts} />}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={filters.agentId} onChange={(e) => setFilters((f) => ({ ...f, agentId: e.target.value }))}>
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={filters.allowed} onChange={(e) => setFilters((f) => ({ ...f, allowed: e.target.value }))}>
          <option value="">All outcomes</option>
          <option value="true">Allowed</option>
          <option value="false">Denied</option>
        </select>
        <input className="input w-56" placeholder="Filter merchant…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        <span className="text-xs text-[var(--text-faint)]">
          {statusCount(true)} allowed · {statusCount(false)} denied
        </span>
        <div className="ml-auto flex gap-2">
          <button className="btn btn-secondary text-sm" onClick={() => void load()} disabled={loading}>
            {loading ? "…" : "Refresh"}
          </button>
          <button className="btn btn-secondary text-sm" onClick={() => void seed()} disabled={seeding}>
            {seeding ? "Seeding…" : "Load demo data"}
          </button>
        </div>
      </div>

      {attempts.length === 0 && !loading ? (
        <EmptyState
          title="No payment activity yet"
          hint="Run a payment in the Simulator, or load demo data to populate the ledger."
          action={
            <button className="btn btn-primary" onClick={() => void seed()} disabled={seeding}>
              Load demo data
            </button>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-[0.8125rem]">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[0.625rem] uppercase tracking-[0.06em] text-[var(--text-faint)]">
                <th className="w-6 px-2 py-2.5" />
                <th className="px-4 py-2.5 font-semibold">Time</th>
                <th className="px-4 py-2.5 font-semibold">Agent</th>
                <th className="px-4 py-2.5 font-semibold">Merchant</th>
                <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold">Risk</th>
                <th className="px-4 py-2.5 font-semibold">Settlement</th>
              </tr>
            </thead>
            <tbody ref={bodyRef}>
              {attempts.map((a) => {
                const open = openId === a.id;
                const explain = explainDecision({
                  reason: a.reason,
                  merchant: a.merchant,
                  amount: a.amount,
                  currency: a.currency,
                  riskScore: a.riskScore,
                  detail: a.detail,
                });
                return (
                  <ExplainRow
                    key={a.id}
                    a={a}
                    open={open}
                    toggle={() => setOpenId(open ? null : a.id)}
                    explanation={explain}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExplainRow({
  a,
  open,
  toggle,
  explanation,
}: {
  a: PaymentAttempt;
  open: boolean;
  toggle: () => void;
  explanation: DecisionExplanation;
}) {
  return (
    <>
      <tr data-row className="cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)]" onClick={toggle}>
        <td className="px-2 py-2.5">
          <span className={`inline-block text-[var(--text-faint)] transition-transform duration-200 ${open ? "rotate-90" : ""}`}>▸</span>
        </td>
        <td className="px-4 py-2.5 text-[var(--text-muted)]">{fmtTime(a.createdAt)}</td>
        <td className="px-4 py-2.5 font-semibold text-[var(--text-secondary)]">{a.agentName}</td>
        <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">{a.merchant}</td>
        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--text-secondary)]">{money(a.amount, a.currency)}</td>
        <td className="px-4 py-2.5">
          <StatusBadge allowed={a.allowed} />
        </td>
        <td className="px-4 py-2.5 text-right">
          <RiskPill score={a.riskScore} />
        </td>
        <td className="px-4 py-2.5">
          <TxHash hash={a.transactionHash} />
        </td>
      </tr>
      {open && (
        <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
          <td colSpan={8} className="px-6 py-4">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-semibold text-[var(--text)]">{explanation.title}</span>
              <ReasonChip reason={a.reason} />
            </div>
            <p className="text-sm text-[var(--text-muted)]">{explanation.summary}</p>
            {explanation.detail.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-[var(--text-faint)]">
                {explanation.detail.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[var(--text-faint)]">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
