import { RULES } from "./content";

export function RulePipelineSection() {
  return (
    <section id="rules">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">
        The 10-rule evaluation pipeline
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
        Every payment runs through this strict pipeline before any settlement. Blue rules come from{" "}
        <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[0.6875rem] text-[var(--periwinkle)]">@payai-sh/core</code>; violet rules are added by Agent
        Payment Guard.
      </p>
      <div className="mt-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.8125rem]">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[0.625rem] uppercase tracking-[0.06em] text-[var(--text-faint)]">
                <th className="px-4 py-2.5 font-semibold">#</th>
                <th className="px-4 py-2.5 font-semibold">Rule</th>
                <th className="px-4 py-2.5 font-semibold">Source</th>
                <th className="px-4 py-2.5 font-semibold">Denied when</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((rule) => (
                <tr
                  key={rule.n}
                  className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--surface-2)]"
                >
                  <td className="px-4 py-2.5 tabular-nums text-[0.8125rem] text-[var(--text-faint)]">{rule.n}</td>
                  <td className="px-4 py-2.5 text-[0.8125rem] font-semibold text-[var(--text-secondary)]">{rule.name}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        rule.source === "new"
                          ? "chip text-[0.625rem] bg-violet-50 text-violet-700"
                          : "chip text-[0.625rem] bg-blue-50 text-blue-700"
                      }
                    >
                      {rule.source === "new" ? "new" : "payai"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[0.6875rem] text-[var(--text-muted)]">{rule.denyWhen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2.5 border-t border-[var(--border)] px-4 py-3 text-[0.6875rem] text-[var(--text-muted)]">
          <span className="chip text-[0.625rem] bg-green-50 text-green-700">Fail-closed</span>
          No payment reaches settlement unless every enabled rule passes. Denied attempts are
          recorded to the shared ledger with their decision context.
        </div>
      </div>
    </section>
  );
}
