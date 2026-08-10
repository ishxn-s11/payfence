import { NextResponse } from "next/server";
import { seedDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await seedDemoData();
  return NextResponse.json({ ok: true, ...result });
}