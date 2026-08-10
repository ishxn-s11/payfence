import { FEASIBILITY, FUTURE_WORK } from "./content";

const READINESS_TONE: Record<string, string> = {
  High: "bg-green-50 text-green-700",
  "High–Medium": "bg-orange-50 text-orange-700",
  Medium: "bg-blue-50 text-blue-700",
};

export function FeasibilitySection() {
  return (
    <section id="feasibility">
      <h2 className="text-xl font-semibold text-slate-900">Feasibility by institution type</h2>
      <p className="mt-1 text-sm text-slate-500">
        The policy engine is rail-agnostic — a <code className="font-mono text-xs">payer</code> hook
        connects any real x402 client or ERC-7710 relay — so the same rules adapt across domains.
      </p>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Institution</th>
                <th className="px-4 py-3 font-medium">Readiness</th>
                <th className="px-4 py-3 font-medium">Primary benefit</th>
                <th className="px-4 py-3 font-medium">Key consideration</th>
                <th className="px-4 py-3 font-medium">Focal rules</th>
              </tr>
            </thead>
            <tbody>
              {FEASIBILITY.map((row) => (
                <tr key={row.institution} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{row.institution}</td>
                  <td className="px-4 py-2.5">
                    <span className={`chip ${READINESS_TONE[row.readiness]}`}>{row.readiness}</span>
                  </td>
                  <td className="max-w-xs px-4 py-2.5 text-xs text-slate-500">{row.benefit}</td>
                  <td className="max-w-xs px-4 py-2.5 text-xs text-slate-500">{row.consideration}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{row.focus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-800">On the roadmap</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FUTURE_WORK.map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-medium text-slate-700">{item.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
