import Link from "next/link";

const links = [
  { href: "/", label: "Overview" },
  { href: "/grants", label: "Grants" },
  { href: "/agents", label: "Agents" },
  { href: "/payments", label: "Payments" },
  { href: "/analytics", label: "Analytics" },
  { href: "/simulate", label: "Simulator" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#232b3c] bg-charcoal/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-[15px] font-semibold text-[#eef2f5]">
          <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-pink-500 text-sm font-bold text-charcoal">
            ◉
          </span>
          Pay-Fence
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-sm px-3 py-1.5 text-[#7d8aa5] transition-colors hover:bg-[#1c2230] hover:text-[#eef2f5]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[11px] uppercase tracking-[0.2em] text-[#5f6b85] lg:block">
            x402 · policy control plane
          </span>
          <Link
            href="/simulate"
            className="rounded-sm bg-pink-500 px-3 py-1.5 text-sm font-semibold text-charcoal transition-colors hover:bg-pink-600"
          >
            Simulate payment
          </Link>
        </div>
      </div>
    </header>
  );
}
