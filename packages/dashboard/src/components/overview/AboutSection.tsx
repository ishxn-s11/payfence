import { Card } from "@/components/ui";

export function AboutSection() {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900">About this project</h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <Card title="The problem">
          <p className="text-sm leading-relaxed text-slate-500">
            AI agents that can make autonomous payments introduce real financial risk: accidental
            large transfers, payments to the wrong recipient, rapid-fire spending, or a slowly
            draining budget. <span className="text-slate-700">Post-payment monitoring only catches
            damage after settlement.</span>
          </p>
        </Card>
        <Card title="The answer — a fail-closed policy layer">
          <p className="text-sm leading-relaxed text-slate-500">
            Pay-Fence interposes between agent intent and settlement.{" "}
            <span className="text-slate-700">No payment reaches settlement unless every enabled
            rule passes.</span> Rules 1–7 (currency, expiry, allowlists, limits, budget) come from{" "}
            <code className="font-mono text-xs">@payai-sh/core</code>; rules 8–10 (frequency,
            rolling-window budget, risk scoring) are this project's additions.
          </p>
        </Card>
        <Card title="How the dashboard fits">
          <p className="text-sm leading-relaxed text-slate-500">
            The dashboard is a <span className="text-slate-700">management surface, not a separate
            enforcement path</span>. It shares the same SQLite ledger (<code className="font-mono text-xs">
            node:sqlite</code>) as the policy engine, so every evaluation updates real budget and
            rate-limit state — what you see here is exactly what an autonomous agent experiences.
          </p>
        </Card>
      </div>
    </section>
  );
}
