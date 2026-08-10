import { createReceipt, parsePaymentQuote, type PaymentQuote, type PaymentReceipt } from "@payai-sh/core";
import type { EnhancedSpendingLedger } from "@pay-fence/ledger-persistent";
import { evaluateEnhancedPayment } from "./evaluator.js";
import type { RiskScorer } from "./risk/scorer.js";
import type { EnhancedPaymentDecision, EnhancedSpendingGrant } from "./types.js";

export interface PayAIFetchInit extends RequestInit {
  /** Declared purpose, matched against `grant.allowedPurposes`. */
  purpose?: string;
  /** Override the merchant derived from the request host. */
  merchant?: string;
  /** Resource being paid for. */
  resource?: string;
}

/** Passed to the settlement (`payer`) hook once policy allows a payment. */
export interface X402PaymentRequest {
  originalRequest: Request;
  quote: PaymentQuote;
  /** Headers the payer should attach payment proof to (e.g. X-Payment). */
  paymentHeaders: Headers;
  /** Retries the original request with the given headers and returns the response. */
  fetch(headers: Headers): Promise<Response>;
}

export type X402Payer = (request: X402PaymentRequest) => Promise<Response>;

export interface CreateEnhancedFetchOptions {
  grant: EnhancedSpendingGrant;
  ledger: EnhancedSpendingLedger;
  /** Underlying fetch; defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Executes settlement for an approved payment (signs/attaches x402 proof). */
  payer: X402Payer;
  /** Risk scorers registered by type name. */
  riskScorers?: RiskScorer[];
  /** Called with a receipt after settlement. */
  onReceipt?: (receipt: PaymentReceipt) => void | Promise<void>;
  /** Called whenever a risk score was computed, whether or not it was blocked. */
  onRiskAlert?: (alert: RiskAlert) => void | Promise<void>;
}

export interface RiskAlert {
  quote: PaymentQuote;
  decision: EnhancedPaymentDecision;
}

/** Thrown when policy denies a payment before settlement. */
export class PaymentPolicyError extends Error {
  readonly decision: EnhancedPaymentDecision;
  readonly quote: PaymentQuote;

  constructor(decision: EnhancedPaymentDecision, quote: PaymentQuote) {
    super(`Payment denied by policy: ${decision.reason}`);
    this.name = "PaymentPolicyError";
    this.decision = decision;
    this.quote = quote;
  }
}

const PAYMENT_REQUIREMENT_HEADERS = [
  "x-request-payment",
  "x-accept-payment",
  "x-402-payment-required",
] as const;

/**
 * A fetch wrapper that interposes policy enforcement between an agent and a
 * paid API, mirroring `@payai-sh/x402`'s `createPayAIFetch` but evaluating the
 * full enhanced policy (frequency, rolling budgets, risk) before settlement:
 *
 *   request → 402 → parse quote → evaluate policy → [deny: throw] →
 *   payer hook (settlement) → record receipt → return paid response
 *
 * If the upstream response is not a 402, it is returned untouched.
 */
export function createEnhancedPayAIFetch(
  options: CreateEnhancedFetchOptions,
): (input: string | URL | Request, init?: PayAIFetchInit) => Promise<Response> {
  const baseFetch = options.fetch ?? fetch;
  const { grant, ledger } = options;

  return async function payaiFetch(
    input: string | URL | Request,
    init: PayAIFetchInit = {},
  ): Promise<Response> {
    const request = toRequest(input, init);
    const retryRequest = request.clone();
    const firstResponse = await baseFetch(request);

    if (firstResponse.status !== 402) {
      return firstResponse;
    }

    const quote = await parseX402Quote(firstResponse, request, init);
    const decision = await evaluateEnhancedPayment(grant, quote, {
      ledger,
      riskScorers: options.riskScorers,
    });

    if (decision.riskScore !== undefined) {
      await options.onRiskAlert?.({ quote, decision });
    }

    if (!decision.allowed) {
      throw new PaymentPolicyError(decision, quote);
    }

    const paymentHeaders = new Headers();
    paymentHeaders.set("X-PayAI-Grant", grant.id);
    paymentHeaders.set("X-PayAI-Agent", grant.agentId);
    paymentHeaders.set("X-PayAI-Purpose", quote.purpose ?? "unspecified");

    const paidResponse = await options.payer({
      originalRequest: request,
      quote,
      paymentHeaders,
      fetch: async (headers: Headers) => {
        const retryHeaders = new Headers(retryRequest.headers);
        headers.forEach((value, key) => retryHeaders.set(key, value));
        return baseFetch(new Request(retryRequest, { headers: retryHeaders }));
      },
    });

    const receipt = createReceipt({
      grant,
      quote,
      transactionHash: paidResponse.headers.get("X-Payment-Transaction") ?? undefined,
    });

    ledger.record(receipt);
    await options.onReceipt?.(receipt);

    return paidResponse;
  };
}

async function parseX402Quote(
  response: Response,
  request: Request,
  init: PayAIFetchInit,
): Promise<PaymentQuote> {
  const merchant = init.merchant ?? new URL(request.url).host;

  for (const headerName of PAYMENT_REQUIREMENT_HEADERS) {
    const raw = response.headers.get(headerName);
    if (!raw) continue;
    const parsed = safeJsonParse(raw);
    if (parsed && typeof parsed === "object") {
      return normalizeQuote(parsed as Record<string, unknown>, merchant, init);
    }
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const parsed = await response.clone().json().catch(() => undefined);
    if (parsed && typeof parsed === "object") {
      return normalizeQuote(parsed as Record<string, unknown>, merchant, init);
    }
  }

  throw new Error("Unable to parse x402 payment requirement");
}

function normalizeQuote(
  raw: Record<string, unknown>,
  merchant: string,
  init: PayAIFetchInit,
): PaymentQuote {
  let amount = String(raw.amount ?? raw.maxAmountRequired ?? raw.price ?? "");
  const decimals = raw.tokenDecimals ?? raw.assetDecimals;
  if (
    decimals !== undefined &&
    Number.isInteger(Number(decimals)) &&
    Number(decimals) >= 0 &&
    Number(decimals) <= 18 &&
    /^\d+$/.test(amount)
  ) {
    amount = atomicToDecimal(amount, Number(decimals));
  }
  if (!amount) {
    throw new Error("x402 quote is missing amount");
  }

  return parsePaymentQuote({
    merchant: String(raw.merchant ?? raw.payTo ?? merchant),
    amount: {
      amount,
      currency: String(raw.currency ?? raw.assetSymbol ?? raw.asset ?? "USDC"),
    },
    purpose: init.purpose ?? stringOrUndefined(raw.purpose),
    resource: init.resource ?? stringOrUndefined(raw.resource),
    rail: "x402",
    network: stringOrUndefined(raw.network) ?? stringOrUndefined(raw.chain) ?? "base",
    expiresAt: stringOrUndefined(raw.expiresAt),
  });
}

/** Convert an atomic amount (e.g. wei-scale) to a decimal string with ≤6 places. */
function atomicToDecimal(amount: string, decimals: number): string {
  const SCALE = 10n ** 6n;
  const minor = BigInt(amount);
  const diff = decimals - 6;
  if (diff >= 0) {
    return minorToDecimal(minor / (10n ** BigInt(diff)));
  }
  return minorToDecimal(minor * (10n ** BigInt(-diff)));
}

function minorToDecimal(minorSix: bigint): string {
  const SCALE = 10n ** 6n;
  const whole = minorSix / SCALE;
  const fraction = (minorSix % SCALE).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

function toRequest(input: string | URL | Request, init: RequestInit): Request {
  return input instanceof Request ? new Request(input, init) : new Request(input, init);
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
