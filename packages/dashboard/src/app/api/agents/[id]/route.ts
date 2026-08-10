import { NextResponse } from "next/server";
import { deleteAgent } from "@/lib/agents";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  deleteAgent(id);
  return NextResponse.json({ ok: true });
}