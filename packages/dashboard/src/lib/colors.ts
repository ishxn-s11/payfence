// Cerebrium-inspired data-viz tokens (DARK mode).
// Categorical/chart tokens follow the pink + periwinkle brand harmony.
export const CATA = [
  "#ff488b", // pink-500 (primary)
  "#90aade", // periwinkle
  "#586490", // navy-500
  "#f8a2d3", // pink-200
  "#c6cee0", // slate-300
  "#f6186a", // pink-600
];
export const BLUE_RAMP = ["#90aade", "#586490", "#3a4a70"];
// Status colors stay semantically readable (green/amber/red) on the dark theme.
export const STATUS = {
  good: "#2edb7c",
  warning: "#f2b544",
  serious: "#ec835a",
  critical: "#e0654f",
} as const;
export const INK = {
  primary: "#eef2f5",
  secondary: "#c6cee0",
  muted: "#7d8aa5",
  grid: "#232b3c",
  baseline: "#33415f",
  surface: "#161b28",
} as const;

export function riskColor(score: number): string {
  if (score <= 33) return STATUS.good;
  if (score <= 66) return STATUS.warning;
  return STATUS.critical;
}
