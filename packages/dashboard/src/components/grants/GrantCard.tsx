import Link from "next/link";
import type { GrantUsage } from "@/types/dashboard";
import { BudgetMeter } from "@/components/ui";
import { money, windowLabel } from "@/lib/format";

export function GrantCard({ usage }: { usage: GrantUsage }) {
  const { grant } = usage;
  const statusTone =
    grant.status === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500";

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800">{grant.agentName}</h3>
            <span className={`chip ${statusTone}`}>{grant.status}</span>
          </div>
          <div className="mt-0.5 font-mono text-xs text-slate-400">{grant.id}</div>
        </div>
        <Link href={`/grants/${grant.id}`} className="btn btn-secondary text-xs">
          Edit
        </Link>
      </div>

      <div className="mt-4">
        <BudgetMeter
          percent={usage.percentUsed}
          currency={usage.currency}
          spent={usage.spent}
          total={grant.totalBudget.amount}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
        {grant.perPaymentLimit && (
          <div>
            <span className="text-slate-400">per-payment</span>{" "}
            <span className="tabular-nums">{money(grant.perPaymentLimit.amount, grant.perPaymentLimit.currency)}</span>
          </div>
        )}
        <div>
          <span className="text-slate-400">merchants</span> {grant.allowedMerchants?.length ?? 0}
        </div>
        <div>
          <span className="text-slate-400">purposes</span> {grant.allowedPurposes?.length ?? 0}
        </div>
        <div>
          <span className="text-slate-400">limits</span> {grant.frequencyLimits?.length ?? 0} /{" "}
          {grant.rollingWindows?.length ?? 0} window(s)
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {grant.frequencyLimits?.map((fl, i) => (
          <span key={i} className="chip bg-blue-50 text-blue-700">
            ≤{fl.maxTransactions}/{windowLabel(fl.windowMs)}
          </span>
        ))}
        {grant.rollingWindows?.map((rw, i) => (
          <span key={i} className="chip bg-orange-50 text-orange-700">
            {money(rw.maxSpend.amount, rw.maxSpend.currency)}/{windowLabel(rw.windowMs)}
          </span>
        ))}
        {grant.riskPolicy && (
          <span className="chip bg-violet-50 text-violet-700">risk ≤{grant.riskPolicy.maxRiskScore}</span>
        )}
        {!grant.frequencyLimits?.length && !grant.rollingWindows?.length && !grant.riskPolicy && (
          <span className="chip bg-slate-100 text-slate-500">base rules only</span>
        )}
      </div>
    </div>
  );
}