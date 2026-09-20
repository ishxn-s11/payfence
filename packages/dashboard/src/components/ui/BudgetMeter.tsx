"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { money } from "@/lib/format";
import { prefersReducedMotion } from "@/components/motion";

export function BudgetMeter({
  percent,
  currency,
  spent,
  total,
}: {
  percent: number;
  currency: string;
  spent: string;
  total: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const tone =
    percent >= 95 ? "#ef4444" : percent >= 75 ? "#f59e0b" : percent >= 40 ? "#f97316" : "#3b82f6";
  const width = Math.min(100, percent);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    if (prefersReducedMotion()) {
      bar.style.width = `${width}%`;
      return;
    }
    bar.style.width = "0%";
    const anim = animate(bar as never, { width: `${width}%`, duration: 700, easing: "outExpo" });
    return () => {
      anim.pause();
    };
  }, [width]);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[0.875rem] font-bold tabular-nums text-[var(--text-secondary)]">{money(spent, currency)}</span>
        <span className="text-[0.75rem] text-[var(--text-faint)]">of {money(total, currency)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          ref={barRef}
          className="h-full rounded-full"
          style={{ background: tone }}
        />
      </div>
      <div className="mt-1.5 text-right text-[0.6875rem] font-semibold text-[var(--text-faint)]">
        {percent}% used
      </div>
    </div>
  );
}
