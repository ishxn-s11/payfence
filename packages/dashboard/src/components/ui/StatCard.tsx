"use client";

import { CountUp } from "@/components/motion";

export function StatCard({
  label,
  value,
  sub,
  tone,
  animate: animated,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  animate?: { to: number; format?: (n: number) => string };
  icon?: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[rgba(21,26,37,0.6)] backdrop-blur-sm p-5 transition-all duration-300 hover:border-[var(--border-accent)] hover:-translate-y-0.5">
      {/* Accent gradient at top */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: tone || 'linear-gradient(90deg, var(--brand), var(--periwinkle))',
        }}
      />
      <div className="flex items-start justify-between">
        <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
          {label}
        </div>
        {icon && <div className="text-[var(--text-faint)]">{icon}</div>}
      </div>
      <div
        className="mt-3 text-[1.75rem] font-extrabold tabular-nums tracking-tight leading-none"
        style={tone ? { color: tone } : { color: "var(--text)" }}
      >
        {animated ? <CountUp to={animated.to} format={animated.format} /> : value}
      </div>
      {sub && (
        <div className="mt-2 text-[0.8125rem] text-[var(--text-muted)]">{sub}</div>
      )}
    </div>
  );
}
