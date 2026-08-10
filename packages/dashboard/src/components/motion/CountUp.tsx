"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { prefersReducedMotion } from "./prefersReducedMotion";

/** Animate a numeric span counting up to a target value. */
export function CountUp({
  to,
  duration = 700,
  format,
}: {
  to: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = format ?? ((n: number) => Math.round(n).toString());

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.textContent = fmt(to);
      return;
    }
    const state = { v: 0 };
    const anim = animate(
      state,
      {
        v: [0, to],
        duration,
        easing: "outExpo",
        onUpdate: () => {
          el.textContent = fmt(state.v);
        },
      },
    );
    return () => {
      anim.pause();
    };
  }, [to, duration, fmt]);

  return <span ref={ref}>{fmt(to)}</span>;
}
