import { getDb, cryptoId, nowIso, type Row } from "./db";
import { DEFAULT_ORG } from "./constants";
import type { Agent } from "@/types/dashboard";

export function rowToAgent(row: Row): Agent {
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    name: String(row.name),
    description: String(row.description ?? ""),
    createdAt: String(row.created_at),
  };
}

export function listAgents(orgId: string = DEFAULT_ORG.id): Agent[] {
  const rows = getDb()
    .prepare("SELECT * FROM agents WHERE org_id = ? ORDER BY name ASC")
    .all(orgId) as Row[];
  return rows.map(rowToAgent);
}

export function getAgent(id: string): Agent | undefined {
  const row = getDb().prepare("SELECT * FROM agents WHERE id = ?").get(id) as Row | undefined;
  return row ? rowToAgent(row) : undefined;
}

export interface CreateAgentInput {
  name: string;
  description?: string;
}

export function createAgent(input: CreateAgentInput, orgId: string = DEFAULT_ORG.id): Agent {
  const id = cryptoId("agt");
  const created = nowIso();
  getDb()
    .prepare("INSERT INTO agents (id, org_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, orgId, input.name, input.description ?? "", created);
  return { id, orgId, name: input.name, description: input.description ?? "", createdAt: created };
}

export function deleteAgent(id: string): void {
  getDb().prepare("DELETE FROM agents WHERE id = ?").run(id);
}