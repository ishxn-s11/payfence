import { NextResponse } from "next/server";
import { buildQuote, evaluateQuote, runPayment, type QuoteInput } from "@/lib/payments";
import { getGrant } from "@/lib/grants";

export const dynamic = "force-dynamic";

export interface SimulateBody extends QuoteInput {
  grantId: string;
  /** When false, only preview the decision without recording anything. */
  persist?: boolean;
  /** ISO timestamp override for deterministic evaluation. */
  at?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SimulateBody | null;
  if (!body || !body.grantId || !body.merchant || !body.amount) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const grant = getGrant(body.grantId);
  if (!grant) return NextResponse.json({ error: "grant_not_found" }, { status: 404 });

  const at = body.at ? new Date(body.at) : new Date();

  // Dry-run: evaluate the real policy engine without touching the ledger.
  if (body.persist === false) {
    const grantForEval = getGrant(body.grantId)!;
    const quote = buildQuote(grantForEval, body);
    const decision = await evaluateQuote(grantForEval, quote, at);
    return NextResponse.json({ decision, quote, persisted: false });
  }

  const result = await runPayment({
    grantId: body.grantId,
    merchant: body.merchant,
    amount: body.amount,
    currency: body.currency,
    purpose: body.purpose,
    resource: body.resource,
    network: body.network,
    at: body.at,
  });
  return NextResponse.json({ ...result, persisted: true });
}