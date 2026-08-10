import type { Currency, Money } from "@payai-sh/core";

/** Number of decimal places used by the internal minor-unit representation. */
export const DEFAULT_DECIMALS = 6;

const SCALE = 10n ** 6n;
const AMOUNT_RE = /^\d+(\.\d{1,6})?$/;

export function isValidAmount(amount: string): boolean {
  return AMOUNT_RE.test(amount);
}

/** Convert a decimal money amount to integer minor units (e.g. USDC micro-units). */
export function toMinorUnits(money: Money): bigint {
  if (!isValidAmount(money.amount)) {
    throw new Error(`Invalid money amount: ${money.amount}`);
  }
  const [whole = "0", fraction = ""] = money.amount.split(".");
  const padded = `${fraction}000000`.slice(0, 6);
  return BigInt(whole) * SCALE + BigInt(padded);
}

/** Convert integer minor units back to a decimal money amount. */
export function fromMinorUnits(minor: bigint, currency: Currency): Money {
  const sign = minor < 0n ? "-" : "";
  const abs = minor < 0n ? -minor : minor;
  const whole = abs / SCALE;
  const fraction = (abs % SCALE).toString().padStart(6, "0").replace(/0+$/, "");
  return { amount: `${sign}${whole}${fraction ? `.${fraction}` : ""}`, currency };
}

export function compareMoney(left: Money, right: Money): number {
  assertSameCurrency(left, right);
  const a = toMinorUnits(left);
  const b = toMinorUnits(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return fromMinorUnits(toMinorUnits(left) + toMinorUnits(right), left.currency);
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return fromMinorUnits(toMinorUnits(left) - toMinorUnits(right), left.currency);
}

function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new Error(`Currency mismatch: ${left.currency} !== ${right.currency}`);
  }
}
