export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[rgba(21,26,37,0.5)] backdrop-blur-md p-10 sm:p-14 lg:p-20">
      {/* Multi-layer gradient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 500px at 85% 10%, rgba(255, 72, 139, 0.12), transparent 50%), radial-gradient(600px 350px at 15% 90%, rgba(144, 170, 222, 0.10), transparent 50%), radial-gradient(400px 300px at 50% 50%, rgba(139, 92, 246, 0.05), transparent 50%)",
        }}
      />

      {/* Floating parallax orbs */}
      <div className="pointer-events-none absolute right-10 top-10 h-24 w-24 rounded-full bg-[var(--brand)]/5 blur-3xl float-slow" />
      <div className="pointer-events-none absolute bottom-10 left-10 h-32 w-32 rounded-full bg-[var(--periwinkle)]/5 blur-3xl float-medium" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/3 h-16 w-16 rounded-full bg-purple-500/5 blur-2xl float-fast" />

      {/* Top accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)]/30 to-transparent" />
      <div className="relative">
        <div className="inline-flex items-center gap-2.5 text-[0.75rem] font-bold uppercase tracking-[0.25em] text-[var(--brand)]">
          <span className="h-2 w-2 rounded-full bg-[var(--brand)]" />
          Pay-Fence
        </div>
        <h2 className="word-reveal mt-6 max-w-4xl font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-[var(--text)] sm:text-5xl lg:text-6xl">
          <span>The </span>
          <span>fail-closed </span>
          <span>policy </span>
          <span>layer </span>
          <span>for </span>
          <span className="bg-gradient-to-r from-[var(--brand)] via-[#d946ef] to-[var(--periwinkle)] bg-clip-text text-transparent">AI-agent </span>
          <span className="bg-gradient-to-r from-[var(--brand)] via-[#d946ef] to-[var(--periwinkle)] bg-clip-text text-transparent">payments.</span>
        </h2>
        <p className="mt-7 max-w-2xl text-lg leading-[1.8] text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-secondary)]">x402 answers <em>how</em> an agent pays.</span>{" "}
          Pay-Fence answers <em className="text-[var(--text-secondary)]">should this agent be allowed to pay, right now, for this
          merchant, for this much</em> — every autonomous payment is validated against configurable
          rules <strong className="text-[var(--text-secondary)]">before settlement</strong>, so an agent can pay
          seamlessly without being able to overspend or reach unintended merchants.
        </p>
        <ul className="mt-8 flex flex-wrap gap-2.5 text-sm text-[var(--text-secondary)]">
          {[
            "10-rule evaluation pipeline",
            "Checked before settlement",
            "Shared SQLite ledger",
            "Fail-closed by default",
          ].map((item) => (
            <li
              key={item}
              className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)]/60 backdrop-blur-sm px-4 py-2 font-medium transition-colors duration-300 hover:border-[var(--brand)]/20"
            >
              {item}
            </li>
          ))}
        </ul>
        <nav className="mt-10 flex flex-wrap gap-3">
          <a href="#rules" className="btn btn-primary text-sm">
            The 10 rules ↓
          </a>
          <a href="#use-cases" className="btn btn-secondary text-sm">
            Use cases ↓
          </a>
          <a href="#feasibility" className="btn btn-ghost text-sm">
            Feasibility ↓
          </a>
        </nav>
      </div>
    </section>
  );
}
