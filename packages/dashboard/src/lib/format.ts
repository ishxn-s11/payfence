import { moneyInr, usdcToInr } from "./currency";

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtRel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Render a money value. USDC/USDT amounts are converted to INR for display. */
export function money(amount: string, currency: string): string {
  if (currency === "USDC" || currency === "USDT") return moneyInr(amount);
  return `${amount} ${currency}`;
}

/** USD-style money label for values already stored as USDC (kept for context). */
export function usdc(amount: string, currency: string): string {
  return `${amount} ${currency}`;
}

/** Convert a USDC decimal amount to a numeric INR value for chart scaling. */
export function inrAmount(usdcAmount: string | number): number {
  return usdcToInr(usdcAmount);
}

export function windowLabel(windowMs: number): string {
  const m = windowMs / 60000;
  if (m < 60) return `${round(m)}m`;
  const h = m / 60;
  if (h < 24) return `${round(h)}h`;
  return `${round(h / 24)}d`;
}

export function round(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}