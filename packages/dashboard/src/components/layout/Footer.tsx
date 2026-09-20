export function Footer() {
  return (
    <footer className="relative z-10 overflow-hidden border-t border-[var(--border-strong)]/30">
      {/* Gradient wash background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 200px at 20% 50%, rgba(255, 72, 139, 0.04), transparent 60%), radial-gradient(400px 150px at 80% 50%, rgba(144, 170, 222, 0.03), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Main footer — compact 2-row layout */}
        <div className="flex flex-col gap-6 py-8 sm:py-10 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          {/* Left: Brand + description */}
          <div className="max-w-xs shrink-0">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--brand)] text-[0.625rem] font-extrabold text-white">◉</span>
              Pay-Fence
            </div>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--text-muted)]">
              Fail-closed policy layer for AI-agent payments.
            </p>
          </div>

          {/* Right: Links in a row */}
          <div className="flex flex-wrap gap-x-10 gap-y-4 text-[0.8125rem]">
            {/* Product */}
            <div>
              <h4 className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">Product</h4>
              <ul className="mt-2 space-y-1.5 text-[var(--text-muted)]">
                <li><a href="/" className="transition-colors hover:text-[var(--text)]">Overview</a></li>
                <li><a href="/grants" className="transition-colors hover:text-[var(--text)]">Grants</a></li>
                <li><a href="/agents" className="transition-colors hover:text-[var(--text)]">Agents</a></li>
                <li><a href="/payments" className="transition-colors hover:text-[var(--text)]">Payments</a></li>
                <li><a href="/analytics" className="transition-colors hover:text-[var(--text)]">Analytics</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">Resources</h4>
              <ul className="mt-2 space-y-1.5 text-[var(--text-muted)]">
                <li><a href="/simulator" className="transition-colors hover:text-[var(--text)]">Simulator</a></li>
                <li><span className="text-[var(--text-faint)]">Documentation</span></li>
                <li><span className="text-[var(--text-faint)]">API Reference</span></li>
              </ul>
            </div>

            {/* Status */}
            <div>
              <h4 className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">Status</h4>
              <ul className="mt-2 space-y-1.5 text-[var(--text-muted)]">
                <li className="flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  All systems operational
                </li>
                <li><span className="text-[var(--text-faint)]">Policy Engine v1.0</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar — single line */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-[var(--border)]/40 py-4 text-[0.75rem] text-[var(--text-faint)] sm:flex-row">
          <span>© {new Date().getFullYear()} Pay-Fence. Fail-closed by default.</span>
          <span className="flex items-center gap-3">
            <span>x402 · @payai-sh/core</span>
            <span className="text-[var(--border-strong)]">|</span>
            <span>Node.js SQLite</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
