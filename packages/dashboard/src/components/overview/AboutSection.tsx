import { Card } from "@/components/ui";

export function AboutSection() {
  return (
    <section>
      <h2 className="word-reveal font-display text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">
        <span>About </span>
        <span>this </span>
        <span>project</span>
      </h2>
      <p className="mt-3 max-w-xl text-base text-[var(--text-muted)]">
        Understanding the problem, the solution, and how the dashboard fits in.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card-tilt">
          <Card title="The problem">
            <p className="text-sm leading-[1.8] text-[var(--text-muted)]">
              AI agents that can make autonomous payments introduce real financial risk: accidental
              large transfers, payments to the wrong recipient, rapid-fire spending, or a slowly
              draining budget. <span className="font-medium text-[var(--text-secondary)]">Post-payment monitoring only catches
              damage after settlement.</span>
            </p>
          </Card>
        </div>
        <div className="card-tilt">
          <Card title="The answer — a fail-closed policy layer">
            <p className="text-sm leading-[1.8] text-[var(--text-muted)]">
              Pay-Fence interposes between agent intent and settlement.{" "}
              <span className="font-medium text-[var(--text-secondary)]">No payment reaches settlement unless every enabled
              rule passes.</span> Rules 1–7 (currency, expiry, allowlists, limits, budget) come from{" "}
              <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[0.6875rem] text-[var(--periwinkle)]">@payai-sh/core</code>; rules 8–10 (frequency,
              rolling-window budget, risk scoring) are this project&apos;s additions.
            </p>
          </Card>
        </div>
        <div className="card-tilt">
          <Card title="How the dashboard fits">
            <p className="text-sm leading-[1.8] text-[var(--text-muted)]">
              The dashboard is a <span className="font-medium text-[var(--text-secondary)]">management surface, not a separate
              enforcement path</span>. It shares the same SQLite ledger (<code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[0.6875rem] text-[var(--periwinkle)]">
              node:sqlite</code>) as the policy engine, so every evaluation updates real budget and
              rate-limit state — what you see here is exactly what an autonomous agent experiences.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
