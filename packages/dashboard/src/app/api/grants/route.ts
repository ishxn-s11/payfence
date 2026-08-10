import { NextResponse } from "next/server";
import { createGrant, getGrantUsage, listGrants, type CreateGrantInput } from "@/lib/grants";
import { getLedger } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sp = url.searchParams;
  const grants = listGrants({
    orgId: sp.get("orgId") ?? undefined,
    agentId: sp.get("agentId") ?? undefined,
    status: sp.get("status") ?? undefined,
  });

  if (sp.get("withUsage") === "true") {
    const ledger = getLedger();
    const usage = await Promise.all(grants.map((g) => getGrantUsage(g, ledger)));
    return NextResponse.json({ grants: usage });
  }

  return NextResponse.json({ grants });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CreateGrantInput | null;
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!body.agentId) {
    return NextResponse.json({ error: "agent_required" }, { status: 400 });
  }
  if (!body.totalBudget || !body.totalBudget.amount) {
    return NextResponse.json({ error: "budget_required" }, { status: 400 });
  }
  const grant = createGrant(body);
  return NextResponse.json({ grant }, { status: 201 });
}