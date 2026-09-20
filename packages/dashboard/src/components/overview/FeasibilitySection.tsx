import { FEASIBILITY, FUTURE_WORK } from "./content";

const READINESS_TONE: Record<string, string> = {
  High: "bg-green-50 text-green-700",
  "High–Medium": "bg-orange-50 text-orange-700",
  Medium: "bg-blue-50 text-blue-700",
};

export function FeasibilitySection() {
  return (
    <section id="feasibility">
      <h2 className="word-reveal font-display text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">
        <span>Feasibility </span>
        <span>by </span>
        <span>institution </span>
        <span>type</span>
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-muted)]">
        The policy engine is rail-agnostic — a{" "}
        <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[0.6875rem] text-[var(--periwinkle)]">
          payer
        </code>{" "}
        hook connects any real x402 client or ERC-7710 relay — so the same rules adapt across domains.
      </p>
      <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[rgba(21,26,37,0.7)] backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--text-faint)]">
                <th className="px-4 py-3 font-semibold">Institution</th>
                <th className="px-4 py-3 font-semibold">Readiness</th>
                <th className="px-4 py-3 font-semibold">Primary benefit</th>
                <th className="px-4 py-3 font-semibold">Key consideration</th>
                <th className="px-4 py-3 font-semibold">Focal rules</th>
              </tr>
            </thead>
            <tbody>
              {FEASIBILITY.map((row) => (
                <tr
                  key={row.institution}
                  className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--surface-2)]"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">{row.institution}</td>
                  <td className="px-4 py-3">
                    <span className={`chip text-[0.6875rem] ${READINESS_TONE[row.readiness]}`}>{row.readiness}</span>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-[0.8125rem] leading-relaxed text-[var(--text-muted)]">{row.benefit}</td>
                  <td className="max-w-xs px-4 py-3 text-[0.8125rem] leading-relaxed text-[var(--text-muted)]">{row.consideration}</td>
                  <td className="px-4 py-3 font-mono text-[0.75rem] text-[var(--text-muted)]">{row.focus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="word-reveal font-display text-xl font-extrabold tracking-tight text-[var(--text-secondary)] sm:text-2xl">
          <span>On </span>
          <span>the </span>
          <span>roadmap</span>
        </h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FUTURE_WORK.map((item) => (
            <div
              key={item.title}
              className="card-tilt rounded-xl border border-[var(--border-strong)] bg-[rgba(21,26,37,0.7)] backdrop-blur-sm p-5 transition-all duration-300 hover:border-[var(--border-accent)]"
            >
              <div className="text-sm font-bold text-[var(--text-secondary)]">{item.title}</div>
              <p className="mt-2 text-[0.8125rem] leading-[1.7] text-[var(--text-muted)]">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
