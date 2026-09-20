"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Agent } from "@/types/dashboard";
import { Card, EmptyState } from "@/components/ui";
import { Reveal } from "@/components/motion";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [grants, setGrants] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const [aRes, gRes] = await Promise.all([
      api<{ agents: Agent[] }>("/api/agents"),
      api<{ grants: { agentId: string }[] }>("/api/grants"),
    ]);
    setAgents(aRes.agents);
    const counts: Record<string, number> = {};
    for (const g of gRes.grants) counts[g.agentId] = (counts[g.agentId] ?? 0) + 1;
    setGrants(counts);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api("/api/agents", { method: "POST", body: JSON.stringify({ name: name.trim(), description }) });
      setName("");
      setDescription("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <Reveal>
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">Agents</h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--text-muted)]">The autonomous agents your organization has enrolled.</p>
      </div>

      <Card title="Enroll an agent">
        <form onSubmit={create} className="flex flex-wrap items-end gap-4">
          <div className="min-w-40 flex-1">
            <label className="label">Agent name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. research-01" />
          </div>
          <div className="min-w-52 flex-1">
            <label className="label">Description</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this agent does" />
          </div>
          <button className="btn btn-primary text-sm" disabled={creating || !name.trim()}>
            {creating ? "Adding…" : "Enroll agent"}
          </button>
        </form>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--brand)]" />
            Loading…
          </div>
        </div>
      ) : agents.length === 0 ? (
        <EmptyState title="No agents enrolled" hint="Enroll an agent above, then create a grant to control what it can spend." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <Link key={a.id} href={`/agents/${a.id}`} className="group card p-5 transition-all duration-200 hover:border-[var(--border-accent)]">
              <div className="flex items-center justify-between">
                <h3 className="text-[1.0625rem] font-bold text-[var(--text)] group-hover:text-[var(--brand)] transition-colors">{a.name}</h3>
                <span className="chip bg-brand-50 text-brand-700">{grants[a.id] ?? 0} grants</span>
              </div>
              <p className="mt-2 line-clamp-2 text-[0.875rem] leading-relaxed text-[var(--text-muted)]">{a.description || "No description"}</p>
              <div className="mt-3 font-mono text-xs text-[var(--text-faint)]">{a.id}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
    </Reveal>
  );
}
