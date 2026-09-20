"use client";

import { useEffect, useRef } from "react";

/**
 * LinusBio-style scroll progress indicator — a thin gradient bar
 * at the very top of the viewport that fills as the user scrolls.
 */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    function onScroll() {
      if (!bar) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = `${Math.min(progress, 100)}%`;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent">
      <div
        ref={barRef}
        className="h-full rounded-r-full"
        style={{
          width: "0%",
          background: "linear-gradient(90deg, #ff488b, #d946ef, #90aade)",
          transition: "width 0.1s linear",
        }}
      />
    </div>
  );
}
