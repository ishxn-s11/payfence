import { NextResponse } from "next/server";
import { getGrant } from "@/lib/grants";
import {
  queryAttempts,
  recordAttempt,
  type AttemptFilter,
  type AttemptRecordInput,
} from "@/lib/payments";
import { DEFAULT_ORG } from "@/lib/constants";
import { nowIso } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const filter: AttemptFilter = {
    orgId: sp.get("orgId") ?? DEFAULT_ORG.id,
    grantId: sp.get("grantId") ?? undefined,
    agentId: sp.get("agentId") ?? undefined,
    merchant: sp.get("merchant") ?? undefined,
    allowed: (sp.get("allowed") as "true" | "false") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
  };
  const attempts = queryAttempts(filter);
  return NextResponse.json({ attempts });
}

/**
 * Record a payment attempt reported by an agent. Used by the Simulator and by
 * real agents that post their onReceipt / denial results to the control plane.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    grantId?: string;
    merchant?: string;
    amount?: string;
    currency?: string;
    purpose?: string;
    allowed?: boolean;
    reason?: string;
    riskScore?: number | null;
    transactionHash?: string | null;
    network?: string;
    detail?: unknown;
    at?: string;
  } | null;

  if (!body || !body.grantId || !body.merchant || !body.amount) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const grant = getGrant(body.grantId);
  if (!grant) return NextResponse.json({ error: "grant_not_found" }, { status: 404 });

  const input: AttemptRecordInput = {
    orgId: grant.orgId,
    grantId: grant.id,
    agentId: grant.agentId,
    agentName: grant.agentName,
    merchant: body.merchant,
    amount: body.amount,
    currency: body.currency ?? grant.totalBudget.currency,
    purpose: body.purpose ?? "",
    allowed: body.allowed ?? false,
    reason: body.reason ?? "reported",
    riskScore: body.riskScore ?? null,
    transactionHash: body.transactionHash ?? null,
    rail: "x402",
    network: body.network ?? "base",
    detail: body.detail ? JSON.stringify(body.detail) : null,
    createdAt: body.at ?? nowIso(),
  };
  const attempt = recordAttempt(input);
  return NextResponse.json({ attempt }, { status: 201 });
}