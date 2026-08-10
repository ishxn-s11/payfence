export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-[#232b3c] bg-[#161b28] p-8 sm:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "linear-gradient(120deg, rgba(255,72,139,0.10), transparent 45%), radial-gradient(520px 240px at 88% 12%, rgba(88,100,144,0.18), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
          Pay-Fence
        </div>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold leading-tight text-[#eef2f5] sm:text-4xl">
          The fail-closed policy layer for AI-agent payments.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#7d8aa5]">
          <span className="font-medium text-[#c6cee0]">x402 answers <em>how</em> an agent pays.</span>{" "}
          Pay-Fence answers <em>should this agent be allowed to pay, right now, for this
          merchant, for this much</em> — every autonomous payment is validated against configurable
          rules <strong className="text-[#c6cee0]">before settlement</strong>, so an agent can pay
          seamlessly without being able to overspend or reach unintended merchants.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2 text-xs text-[#c6cee0]">
          {[
            "10-rule evaluation pipeline",
            "Checked before settlement",
            "Shared SQLite ledger",
            "Fail-closed by default",
          ].map((item) => (
            <li key={item} className="chip border border-[#2a3245] bg-[#1c2230] text-[#c6cee0]">
              {item}
            </li>
          ))}
        </ul>
        <nav className="mt-6 flex flex-wrap gap-2">
          <a href="#rules" className="btn btn-primary">
            The 10 rules ↓
          </a>
          <a href="#use-cases" className="btn btn-secondary">
            Use cases ↓
          </a>
          <a href="#feasibility" className="btn btn-ghost">
            Feasibility ↓
          </a>
        </nav>
      </div>
    </section>
  );
}
