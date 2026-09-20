"use client";

import { useMemo, useRef, useState } from "react";

interface BarChartProps {
  data: { label: string; value: string }[];
  color?: string;
  height?: number;
}

export function BarChart({ data, color = "#ff2d7b", height = 200 }: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);

  const parsed = useMemo(
    () =>
      data.map((d) => ({
        label: d.label,
        num: parseFloat(d.value) || 0,
      })),
    [data],
  );

  const max = Math.max(...parsed.map((p) => p.num), 1);
  const count = parsed.length;
  const padding = { top: 16, bottom: 28, left: 0, right: 0 };

  // Generate SVG path
  const svgW = 600;
  const svgH = height;
  const chartW = svgW - padding.left - padding.right;
  const chartH = svgH - padding.top - padding.bottom;

  const points = parsed.map((p, i) => ({
    x: padding.left + (count <= 1 ? chartW / 2 : (i / (count - 1)) * chartW),
    y: padding.top + chartH - (p.num / max) * chartH,
  }));

  // Smooth curve through points (cubic bezier)
  function smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }
    return d;
  }

  const linePath = smoothPath(points);
  // Close the area path along the bottom
  const areaPath = `${linePath} L ${points[points.length - 1].x},${padding.top + chartH} L ${points[0].x},${padding.top + chartH} Z`;

  // X-axis labels: show first, last, and a few in between
  const labelCount = Math.min(count, 8);
  const labelStep = count <= labelCount ? 1 : Math.floor((count - 1) / (labelCount - 1));
  const xLabels: { x: number; text: string }[] = [];
  for (let i = 0; i < count; i += labelStep) {
    const dayNum = parsed[i].label.slice(-2);
    xLabels.push({ x: points[i].x, text: dayNum });
  }
  // Always include the last label
  if (xLabels[xLabels.length - 1]?.text !== parsed[count - 1].label.slice(-2)) {
    xLabels.push({ x: points[count - 1].x, text: parsed[count - 1].label.slice(-2) });
  }

  // Y-axis ticks
  const yTickCount = 4;
  const yTicks: { y: number; text: string }[] = [];
  for (let i = 0; i <= yTickCount; i++) {
    const val = (max / yTickCount) * i;
    const y = padding.top + chartH - (val / max) * chartH;
    yTicks.push({
      y,
      text: val >= 1000 ? `₹${(val / 1000).toFixed(1)}k` : val > 0 ? `₹${Math.round(val)}` : "₹0",
    });
  }

  // Hover handler
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * svgW;
    // Find nearest point
    let nearest = 0;
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - svgX);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }
    const pt = points[nearest];
    const screenX = (pt.x / svgW) * rect.width;
    const screenY = (pt.y / svgH) * rect.height;
    setTooltip({
      x: screenX,
      y: screenY,
      label: parsed[nearest].label,
      value: parsed[nearest].num,
    });
  }

  const gradientId = "mountain-gradient";

  return (
    <div ref={containerRef} className="relative" style={{ height }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="h-full w-full overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="60%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={t.y}
            x2={svgW - padding.right}
            y2={t.y}
            stroke="var(--border)"
            strokeWidth={0.5}
            strokeDasharray="4 4"
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((t, i) => (
          <text
            key={`y${i}`}
            x={svgW - 2}
            y={t.y - 4}
            fill="var(--text-faint)"
            fontSize={9}
            textAnchor="end"
            fontFamily="var(--font-body)"
          >
            {t.text}
          </text>
        ))}

        {/* Area fill (mountain) */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points (hidden but used for interaction) */}
        {points.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={0} fill="transparent" />
        ))}

        {/* Active dot on hover */}
        {tooltip && (() => {
          const nearest = parsed.findIndex((p) => p.label === tooltip.label);
          if (nearest < 0) return null;
          const pt = points[nearest];
          return (
            <>
              <line
                x1={pt.x}
                y1={padding.top}
                x2={pt.x}
                y2={padding.top + chartH}
                stroke="var(--text-faint)"
                strokeWidth={0.5}
                strokeDasharray="3 3"
              />
              <circle cx={pt.x} cy={pt.y} r={4} fill={color} stroke="var(--surface-1)" strokeWidth={2} />
            </>
          );
        })()}

        {/* X-axis labels */}
        {xLabels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={svgH - 4}
            fill="var(--text-faint)"
            fontSize={9}
            textAnchor="middle"
            fontFamily="var(--font-body)"
          >
            {l.text}
          </text>
        ))}
      </svg>

      {/* Tooltip overlay */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y - 12 }}
        >
          <div className="text-[0.625rem] text-[var(--text-faint)]">{tooltip.label}</div>
          <div className="tabular-nums">₹{tooltip.value.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</div>
        </div>
      )}
    </div>
  );
}
