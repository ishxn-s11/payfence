import Link from "next/link";
import type { GrantUsage } from "@/types/dashboard";
import { BudgetMeter } from "@/components/ui";
import { money, windowLabel } from "@/lib/format";

export function GrantCard({ usage }: { usage: GrantUsage }) {
  const { grant } = usage;
  const statusTone =
    grant.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-[var(--surface-2)] text-[var(--text-muted)]";
  const statusDot =
    grant.status === "active" ? "bg-emerald-400" : "bg-[var(--text-faint)]";

  // Health color based on spend percentage
  const healthColor =
    usage.percentUsed >= 90 ? "text-rose-400" : usage.percentUsed >= 70 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="group card overflow-hidden transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-lg hover:shadow-black/20">
      {/* Top accent line — solid, no gradient */}
      <div
        className="h-1 w-full"
        style={{
          background: usage.percentUsed >= 90
            ? "#ef4444"
            : usage.percentUsed >= 70
            ? "#f59e0b"
            : "#ff488b",
        }}
      />

      <div className="p-5">
        {/* Header: agent name + status + edit */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h3 className="truncate text-[1.0625rem] font-bold text-[var(--text)]">{grant.agentName}</h3>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${statusTone}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                {grant.status}
              </span>
            </div>
            <div className="mt-1 font-mono text-[0.6875rem] text-[var(--text-faint)]">{grant.id}</div>
          </div>
          <Link
            href={`/grants/${grant.id}`}
            className="shrink-0 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-1.5 text-[0.6875rem] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            Edit
          </Link>
        </div>

        {/* Budget meter */}
        <div className="mt-4">
          <BudgetMeter
            percent={usage.percentUsed}
            currency={usage.currency}
            spent={usage.spent}
            total={grant.totalBudget.amount}
          />
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-center">
            <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Merchants</div>
            <div className="mt-0.5 text-[1.0625rem] font-extrabold tabular-nums text-[var(--text-secondary)]">{grant.allowedMerchants?.length ?? 0}</div>
          </div>
          <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-center">
            <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Purposes</div>
            <div className="mt-0.5 text-[1.0625rem] font-extrabold tabular-nums text-[var(--text-secondary)]">{grant.allowedPurposes?.length ?? 0}</div>
          </div>
          <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-center">
            <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Risk</div>
            <div className={`mt-0.5 text-[1.0625rem] font-extrabold tabular-nums ${healthColor}`}>
              {grant.riskPolicy ? `≤${grant.riskPolicy.maxRiskScore}` : "—"}
            </div>
          </div>
        </div>

        {/* Per-payment limit */}
        {grant.perPaymentLimit && (
          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
            <span className="text-[0.6875rem] font-semibold text-[var(--text-faint)]">Per-payment limit</span>
            <span className="ml-2 text-[0.8125rem] font-bold tabular-nums text-[var(--text-secondary)]">
              {money(grant.perPaymentLimit.amount, grant.perPaymentLimit.currency)}
            </span>
          </div>
        )}

        {/* Policy chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {grant.frequencyLimits?.map((fl, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[0.625rem] font-bold text-blue-700">
              <span className="h-1 w-1 rounded-full bg-blue-500" />
              ≤{fl.maxTransactions}/{windowLabel(fl.windowMs)}
            </span>
          ))}
          {grant.rollingWindows?.map((rw, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[0.625rem] font-bold text-orange-700">
              <span className="h-1 w-1 rounded-full bg-orange-500" />
              {money(rw.maxSpend.amount, rw.maxSpend.currency)}/{windowLabel(rw.windowMs)}
            </span>
          ))}
          {grant.riskPolicy && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[0.625rem] font-bold text-violet-700">
              <span className="h-1 w-1 rounded-full bg-violet-500" />
              risk ≤{grant.riskPolicy.maxRiskScore}
            </span>
          )}
          {!grant.frequencyLimits?.length && !grant.rollingWindows?.length && !grant.riskPolicy && (
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[0.625rem] font-semibold text-[var(--text-muted)]">
              base rules only
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
