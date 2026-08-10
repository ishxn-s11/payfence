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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Agents</h1>
        <p className="text-sm text-slate-500">The autonomous agents your organization has enrolled.</p>
      </div>

      <Card title="Enroll an agent">
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1">
            <label className="label">Agent name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. research-01" />
          </div>
          <div className="min-w-52 flex-1">
            <label className="label">Description</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this agent does" />
          </div>
          <button className="btn btn-primary" disabled={creating || !name.trim()}>
            {creating ? "Adding…" : "Enroll agent"}
          </button>
        </form>
      </Card>

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
      ) : agents.length === 0 ? (
        <EmptyState title="No agents enrolled" hint="Enroll an agent above, then create a grant to control what it can spend." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <Link key={a.id} href={`/agents/${a.id}`} className="card p-5 transition-shadow hover:shadow">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">{a.name}</h3>
                <span className="chip bg-brand-50 text-brand-700">{grants[a.id] ?? 0} grants</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{a.description || "No description"}</p>
              <div className="mt-3 font-mono text-xs text-slate-400">{a.id}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
    </Reveal>
  );
}