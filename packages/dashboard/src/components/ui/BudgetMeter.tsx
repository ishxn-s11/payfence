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
    percent >= 95 ? "#d03b3b" : percent >= 75 ? "#fab219" : percent >= 40 ? "#eb6834" : "#2a78d6";
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
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-slate-500">{money(spent, currency)} spent</span>
        <span className="text-slate-400">of {money(total, currency)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div ref={barRef} className="h-full rounded-full transition-none" style={{ background: tone }} />
      </div>
    </div>
  );
}
