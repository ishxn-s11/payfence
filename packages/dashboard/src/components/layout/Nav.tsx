"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Overview" },
  { href: "/grants", label: "Grants" },
  { href: "/agents", label: "Agents" },
  { href: "/payments", label: "Payments" },
  { href: "/analytics", label: "Analytics" },
  { href: "/simulate", label: "Simulator" },
];

export function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border-strong)]/50 bg-[#0e1117]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-display text-[15px] font-bold tracking-tight text-[var(--text)]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand)] text-sm font-bold text-white">
            ◉
          </span>
          <span className="hidden sm:inline">Pay-Fence</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 text-sm md:flex">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-md px-3 py-1.5 font-medium transition-colors ${
                  isActive
                    ? "text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute inset-x-1 -bottom-[0.625rem] h-0.5 rounded-full bg-[var(--brand)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)] xl:block">
            x402 · policy control plane
          </span>
          <Link
            href="/simulate"
            className="rounded-md bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:brightness-110 sm:px-4 sm:text-sm"
          >
            Simulate payment
          </Link>

          {/* Mobile hamburger */}
          <button
            className="flex flex-col gap-1 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            <span className={`h-0.5 w-5 rounded-full bg-[var(--text-muted)] transition-all duration-200 ${mobileOpen ? "translate-y-1.5 rotate-45" : ""}`} />
            <span className={`h-0.5 w-5 rounded-full bg-[var(--text-muted)] transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`h-0.5 w-5 rounded-full bg-[var(--text-muted)] transition-all duration-200 ${mobileOpen ? "-translate-y-1.5 -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <nav className="border-t border-[var(--border)] px-4 py-3 md:hidden">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--surface-2)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
