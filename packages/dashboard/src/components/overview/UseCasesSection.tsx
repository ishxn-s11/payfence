import { Card } from "@/components/ui";
import { USE_CASES } from "./content";

export function UseCasesSection() {
  return (
    <section id="use-cases">
      <h2 className="text-xl font-semibold text-slate-900">Use cases across the organization</h2>
      <p className="mt-1 text-sm text-slate-500">
        Wherever an AI agent spends money on an organization's behalf, the same guard rails apply.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {USE_CASES.map((useCase) => (
          <Card key={useCase.domain} title={useCase.domain} className="flex flex-col">
            <div className="text-sm font-medium text-slate-700">{useCase.headline}</div>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-500">{useCase.prevents}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {useCase.rules.map((n) => (
                <span key={n} className="chip bg-slate-100 font-mono text-slate-600">
                  R{n}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
