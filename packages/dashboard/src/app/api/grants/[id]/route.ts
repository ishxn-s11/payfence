import { NextResponse } from "next/server";
import { deleteGrant, getGrant, getGrantUsage, updateGrant, type GrantPatch } from "@/lib/grants";
import { getLedger } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const grant = getGrant(id);
  if (!grant) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const usage = await getGrantUsage(grant, getLedger());
  return NextResponse.json({ grant, usage });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const grant = getGrant(id);
  if (!grant) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const patch = (await request.json().catch(() => null)) as GrantPatch | null;
  if (!patch) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const updated = updateGrant(id, patch);
  return NextResponse.json({ grant: updated });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const grant = getGrant(id);
  if (!grant) return NextResponse.json({ error: "not_found" }, { status: 404 });
  deleteGrant(id);
  return NextResponse.json({ ok: true });
}