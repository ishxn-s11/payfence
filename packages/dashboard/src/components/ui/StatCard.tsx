"use client";

import { CountUp } from "@/components/motion";

export function StatCard({
  label,
  value,
  sub,
  tone,
  animate: animated,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  animate?: { to: number; format?: (n: number) => string };
}) {
  return (
    <div className="card p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div
        className="mt-1 text-2xl font-semibold tabular-nums"
        style={tone ? { color: tone } : undefined}
      >
        {animated ? <CountUp to={animated.to} format={animated.format} /> : value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
