import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SQLEnhancedLedger } from "@pay-fence/ledger-persistent";
import { DEFAULT_ORG } from "./constants";
import { ORG_SCHEMA } from "./schema";

export type Row = Record<string, unknown>;

/**
 * The dashboard runs against a single SQLite database that holds both the
 * policy engine's receipt ledger (`payment_receipts`, via SQLEnhancedLedger)
 * and the dashboard's management tables (agents, grants, payment_attempts).
 * The connection is cached on `globalThis` so Next.js hot-reload never opens
 * a second connection to the same file.
 */

function resolveDbPath(): string {
  if (process.env.DASHBOARD_DB_PATH) return process.env.DASHBOARD_DB_PATH;
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "dashboard.sqlite");
}

function openDatabase(): DatabaseSync {
  const db = new DatabaseSync(resolveDbPath());
  db.exec(ORG_SCHEMA);
  // Migration: add the decision-detail column to pre-existing databases.
  try {
    db.exec("ALTER TABLE payment_attempts ADD COLUMN detail TEXT");
  } catch {
    // column already exists
  }
  ensureDefaultOrg(db);
  return db;
}

function ensureDefaultOrg(db: DatabaseSync): void {
  const existing = db
    .prepare("SELECT id FROM organizations WHERE id = ?")
    .get(DEFAULT_ORG.id) as Row | undefined;
  if (!existing) {
    db.prepare("INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)").run(
      DEFAULT_ORG.id,
      DEFAULT_ORG.name,
      new Date().toISOString(),
    );
  }
}

const globalForDb = globalThis as unknown as {
  __apgDb?: DatabaseSync;
  __apgLedger?: SQLEnhancedLedger;
};

export function getDb(): DatabaseSync {
  if (!globalForDb.__apgDb) {
    globalForDb.__apgDb = openDatabase();
  }
  return globalForDb.__apgDb;
}

export function getLedger(): SQLEnhancedLedger {
  if (!globalForDb.__apgLedger) {
    // SQLEnhancedLedger creates the payment_receipts table + indexes on init.
    globalForDb.__apgLedger = new SQLEnhancedLedger({ db: getDb() });
  }
  return globalForDb.__apgLedger;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function cryptoId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function randomHex(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}
