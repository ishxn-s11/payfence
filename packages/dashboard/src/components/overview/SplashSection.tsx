"use client";

import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { prefersReducedMotion } from "@/components/motion/prefersReducedMotion";

const features = [
  { icon: "🛡️", label: "Fail-closed policy" },
  { icon: "⚡", label: "Real-time evaluation" },
  { icon: "🤖", label: "AI-agent native" },
  { icon: "🔗", label: "x402 protocol" },
];

const stats = [
  { value: "< 50ms", label: "Policy evaluation" },
  { value: "10", label: "Enforced rules" },
  { value: "100%", label: "Settlement audit" },
];

/** Floating animated orb — LinusBio-style ambient particles. */
function Orb({
  size,
  color,
  x,
  y,
  delay,
  duration,
}: {
  size: number;
  color: string;
  x: string;
  y: string;
  delay: number;
  duration: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const anim = animate(el, {
      translateY: [0, -30, 0],
      translateX: [0, 15, -10, 0],
      scale: [1, 1.1, 0.95, 1],
      opacity: [0.5, 0.8, 0.6, 0.5],
      duration,
      delay,
      easing: "easeInOutSine",
      loop: true,
    });
    return () => { anim.pause(); };
  }, [delay, duration]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(40px)",
        opacity: 0.5,
      }}
    />
  );
}

export function SplashSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Stagger-animate all [data-reveal] children once visible
  useEffect(() => {
    if (!visible || prefersReducedMotion()) return;
    const root = sectionRef.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!targets.length) return;

    for (const el of targets) {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
    }

    const anim = animate(targets, {
      opacity: [0, 1],
      translateY: [20, 0],
      easing: "outExpo",
      duration: 800,
      delay: stagger(100, { start: 200 }),
    });
    return () => { anim.pause(); };
  }, [visible]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)]"
      style={{
        minHeight: "480px",
      }}
    >
      {/* Multi-layer gradient wash — LinusBio full-bleed style */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(800px 500px at 85% 15%, rgba(255, 72, 139, 0.15), transparent 55%)",
            "radial-gradient(600px 400px at 10% 85%, rgba(144, 170, 222, 0.12), transparent 55%)",
            "radial-gradient(500px 350px at 50% 50%, rgba(139, 92, 246, 0.06), transparent 55%)",
          ].join(", "),
        }}
      />

      {/* Floating orbs — LinusBio ambient particles */}
      <Orb size={300} color="rgba(255, 72, 139, 0.20)" x="75%" y="5%" delay={0} duration={8000} />
      <Orb size={220} color="rgba(144, 170, 222, 0.15)" x="5%" y="60%" delay={1000} duration={10000} />
      <Orb size={180} color="rgba(139, 92, 246, 0.12)" x="60%" y="70%" delay={2000} duration={9000} />
      <Orb size={120} color="rgba(255, 72, 139, 0.10)" x="30%" y="15%" delay={500} duration={7000} />

      {/* Top accent line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)]/40 to-transparent" />

      {/* Bottom accent line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--periwinkle)]/20 to-transparent" />

      <div className="relative px-8 py-14 sm:px-14 sm:py-20 lg:px-20 lg:py-24">
        {/* Badge */}
        <div data-reveal className="inline-flex items-center gap-2.5 rounded-full border border-[var(--brand)]/20 bg-[var(--brand)]/8 px-4 py-1.5 text-[0.75rem] font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand)]" />
          </span>
          Pay-Fence v1.0
        </div>

        {/* Headline — large, LinusBio-style */}
        <h1
          data-reveal
          className="mt-8 max-w-4xl font-display text-[2.25rem] font-extrabold leading-[1.05] tracking-tight text-[var(--text)] sm:text-5xl lg:text-[3.5rem]"
        >
          The fail-closed policy layer for{" "}
          <span className="bg-gradient-to-r from-[var(--brand)] via-[#d946ef] to-[var(--periwinkle)] bg-clip-text text-transparent">
            AI-agent payments
          </span>
        </h1>

        {/* Subtitle */}
        <p
          data-reveal
          className="mt-6 max-w-2xl text-lg leading-[1.8] text-[var(--text-muted)] sm:text-xl"
        >
          Validate every autonomous payment before settlement. x402 answers{" "}
          <em className="not-italic font-semibold text-[var(--text-secondary)]">how</em> an agent pays.
          Pay-Fence answers{" "}
          <em className="not-italic font-semibold text-[var(--text-secondary)]">should it</em>.
        </p>

        {/* Feature chips */}
        <div data-reveal className="mt-8 flex flex-wrap gap-2.5">
          {features.map((f) => (
            <span
              key={f.label}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)]/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors duration-300 hover:border-[var(--brand)]/30 hover:bg-[var(--surface-3)]"
            >
              <span className="text-base">{f.icon}</span>
              {f.label}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div data-reveal className="mt-12 flex flex-wrap gap-10 border-t border-[var(--border)]/60 pt-8">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-extrabold tabular-nums tracking-tight text-[var(--text)] sm:text-3xl">
                {s.value}
              </div>
              <div className="mt-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
