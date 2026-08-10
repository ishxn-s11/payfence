import { NextResponse } from "next/server";
import { createAgent, listAgents } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ agents: listAgents() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  const agent = createAgent({
    name,
    description: typeof body?.description === "string" ? body.description : "",
  });
  return NextResponse.json({ agent }, { status: 201 });
}