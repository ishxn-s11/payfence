"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { prefersReducedMotion } from "./prefersReducedMotion";

/**
 * Fade + slide a section in the first time it scrolls into view.
 *
 * Hidden state is applied in JS (gsap.set), never CSS, so the content is fully
 * visible for no-JS / prerendered HTML and for reduced-motion users (we skip
 * hiding entirely in those cases).
 */
export function ScrollReveal({
  children,
  className,
  y = 24,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (prefersReducedMotion()) return;

    gsap.set(root, { opacity: 0, y });
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          gsap.to(entry.target, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power2.out",
            delay,
            onComplete: () => io.disconnect(),
          });
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [y, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
