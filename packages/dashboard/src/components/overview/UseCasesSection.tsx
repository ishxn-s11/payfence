import { Card } from "@/components/ui";
import { USE_CASES } from "./content";

export function UseCasesSection() {
  return (
    <section id="use-cases">
      <h2 className="word-reveal font-display text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">
        <span>Use </span>
        <span>cases </span>
        <span>across </span>
        <span>the </span>
        <span>organization</span>
      </h2>
      <p className="mt-3 max-w-xl text-base text-[var(--text-muted)]">
        Wherever an AI agent spends money on an organization&apos;s behalf, the same guard rails apply.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {USE_CASES.map((useCase) => (
          <div key={useCase.domain} className="card-tilt">
            <Card title={useCase.domain} className="flex flex-col">
              <div className="text-sm font-bold text-[var(--text-secondary)]">{useCase.headline}</div>
              <p className="mt-2 flex-1 text-[0.8125rem] leading-[1.7] text-[var(--text-muted)]">{useCase.prevents}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {useCase.rules.map((n) => (
                  <span key={n} className="chip bg-[var(--surface-2)] font-mono text-[0.625rem] text-[var(--text-muted)] border border-[var(--border)]">
                    R{n}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
}
