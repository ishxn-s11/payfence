/**
 * Organization-level schema for the dashboard. The `payment_receipts` table
 * (used by the policy engine's ledger) is created separately by
 * `SQLEnhancedLedger`; these tables are the dashboard's own management layer.
 */
export const ORG_SCHEMA = `
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agents_org ON agents(org_id);

CREATE TABLE IF NOT EXISTS grants (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  total_budget_amount TEXT NOT NULL,
  total_budget_currency TEXT NOT NULL,
  per_payment_limit_amount TEXT,
  per_payment_limit_currency TEXT,
  allowed_merchants TEXT,
  allowed_purposes TEXT,
  frequency_limits TEXT,
  rolling_windows TEXT,
  risk_policy TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_grants_org ON grants(org_id);
CREATE INDEX IF NOT EXISTS idx_grants_agent ON grants(agent_id);
CREATE INDEX IF NOT EXISTS idx_grants_status ON grants(status);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  grant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  merchant TEXT NOT NULL,
  amount_minor_units INTEGER NOT NULL,
  currency TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT '',
  allowed INTEGER NOT NULL,
  reason TEXT NOT NULL,
  risk_score REAL,
  transaction_hash TEXT,
  rail TEXT,
  network TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_org ON payment_attempts(org_id);
CREATE INDEX IF NOT EXISTS idx_attempts_time ON payment_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_grant ON payment_attempts(grant_id);
CREATE INDEX IF NOT EXISTS idx_attempts_agent ON payment_attempts(agent_id);
`;
