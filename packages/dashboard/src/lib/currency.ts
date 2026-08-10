/**
 * Display currency: the policy engine works in USDC (minor units); the
 * dashboard renders amounts in INR. A single client-safe rate keeps every
 * page consistent. (A production deployment would load this from an exchange
 * API or a NEXT_PUBLIC_ env var; keep the constant here so client and server
 * can never disagree.)
 */
export const USDC_TO_INR = 86;

export const INR_SYMBOL = "₹";

/** Convert a USDC amount (decimal string or number) to an INR number. */
export function usdcToInr(amount: string | number): number {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return (Number.isFinite(value) ? value : 0) * USDC_TO_INR;
}

/** Format a plain number with Indian digit grouping. */
export function fmtInr(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

/** Convert a USDC amount to a formatted INR string, e.g. "₹1,075". */
export function moneyInr(usdcAmount: string | number): string {
  return `${INR_SYMBOL}${fmtInr(usdcToInr(usdcAmount))}`;
}

/** Convert an INR amount back to USDC (for simulator input when entered in INR). */
export function inrToUsdc(inrAmount: number): number {
  return (Number.isFinite(inrAmount) ? inrAmount : 0) / USDC_TO_INR;
}

export function rateLabel(): string {
  return `1 USDC ≈ ${moneyInr("1")}`;
}