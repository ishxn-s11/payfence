"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, stagger } from "animejs";
import { prefersReducedMotion } from "./prefersReducedMotion";

interface RevealProps {
  children: ReactNode;
  /** Initial vertical offset (px). */
  y?: number;
  duration?: number;
  delay?: number;
  /** When set, animates `[data-reveal]` children with this stagger delta. */
  stagger?: number;
  className?: string;
}

/** Fade + slide content in on mount. */
export function Reveal({
  children,
  y = 14,
  duration = 480,
  delay = 0,
  stagger: staggerBy = 0,
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (prefersReducedMotion()) return;

    const targets: HTMLElement[] = staggerBy
      ? Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"))
      : [root];
    if (!targets.length) return;

    for (const el of targets) {
      el.style.opacity = "0";
      el.style.transform = `translateY(${y}px)`;
    }

    const anim = animate(
      targets as never,
      {
        opacity: [0, 1],
        translateY: [y, 0],
        easing: "outExpo",
        duration,
        delay: staggerBy ? stagger(staggerBy, { start: delay }) : delay,
      },
    );
    return () => {
      anim.pause();
    };
  }, [y, duration, delay, staggerBy]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
