import { RULES } from "./content";

export function RulePipelineSection() {
  return (
    <section id="rules">
      <h2 className="text-xl font-semibold text-slate-900">The 10-rule evaluation pipeline</h2>
      <p className="mt-1 text-sm text-slate-500">
        Every payment runs through this strict pipeline before any settlement. Blue rules come from{" "}
        <code className="font-mono text-xs">@payai-sh/core</code>; violet rules are added by Agent
        Payment Guard.
      </p>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Rule</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Denied when</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((rule) => (
                <tr key={rule.n} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5 tabular-nums text-slate-400">{rule.n}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{rule.name}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        rule.source === "new"
                          ? "chip bg-violet-50 text-violet-700"
                          : "chip bg-blue-50 text-blue-700"
                      }
                    >
                      {rule.source === "new" ? "new" : "payai"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{rule.denyWhen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span className="chip bg-green-50 text-green-700">Fail-closed</span>
          No payment reaches settlement unless every enabled rule passes. Denied attempts are
          recorded to the shared ledger with their decision context.
        </div>
      </div>
    </section>
  );
}
