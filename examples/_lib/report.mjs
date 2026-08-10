import { PaymentPolicyError } from "@pay-fence/policy-engine";

export function heading(title) {
  console.log(`\n\x1b[1m== ${title} ==\x1b[0m`);
}

export function ok(msg) {
  console.log("  \x1b[32m✓\x1b[0m", msg);
}

export function denied(msg) {
  console.log("  \x1b[31m✗\x1b[0m", msg);
}

export function info(msg) {
  console.log("  \x1b[36m→\x1b[0m", msg);
}

export function explain(msg) {
  console.log("  \x1b[90m•\x1b[0m", msg);
}

export function showGrant(grant) {
  console.log(JSON.stringify(grant, null, 2));
}

/** Run one payment attempt through the policy wrapper and summarize the outcome. */
export async function call(label, payaiFetch, url, init = {}) {
  try {
    const res = await payaiFetch(url, init);
    const body = await res.json().catch(() => ({}));
    ok(`${label}  →  HTTP ${res.status} ${res.status === 200 ? "(served)" : ""}`);
    return { allowed: true, status: res.status, body };
  } catch (error) {
    if (error instanceof PaymentPolicyError) {
      const d = error.decision;
      let detail = `\x1b[31m${d.reason}\x1b[0m`;
      if (d.riskScore !== undefined) detail += `  risk=${d.riskScore}`;
      if (d.frequencyUsage) {
        detail += `  (${d.frequencyUsage.currentCount}/${d.frequencyUsage.maxCount} within ${d.frequencyUsage.windowMs}ms)`;
      }
      denied(`${label}  →  ${detail}`);
      return { allowed: false, decision: d, error };
    }
    throw error;
  }
}

export function showLedger(ledger, grantId) {
  const receipts = ledger.list(grantId);
  const spent = ledger.getSpent(grantId);
  heading("Ledger");
  info(
    `${receipts.length} settled payment(s)` +
      (receipts.length ? `, total ${spent.amount} ${spent.currency}` : ""),
  );
  for (const r of receipts) {
    info(`${r.id}  ${r.amount.amount} ${r.amount.currency}  → ${r.merchant}  ${r.transactionHash ?? ""}`);
  }
}