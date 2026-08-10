/**
 * SQLite schema for the payment receipt ledger.
 *
 * `created_at` is stored as an ISO-8601 UTC string (TEXT) so that lexicographic
 * ordering is equivalent to chronological ordering, which lets time-window
 * queries (`created_at >= ? AND created_at < ?`) use the indexes below.
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS payment_receipts (
  id TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  merchant TEXT NOT NULL,
  amount_minor_units INTEGER NOT NULL,
  currency TEXT NOT NULL,
  purpose TEXT,
  rail TEXT,
  network TEXT,
  resource TEXT,
  transaction_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_receipts_grant_time
  ON payment_receipts(grant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_receipts_merchant
  ON payment_receipts(grant_id, merchant, created_at);

CREATE INDEX IF NOT EXISTS idx_receipts_purpose
  ON payment_receipts(grant_id, purpose, created_at);
`;
