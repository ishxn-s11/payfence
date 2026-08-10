import { NextResponse } from "next/server";
import {
  getAgentActivity,
  getDenialBreakdown,
  getOrgSummary,
  getRiskDistribution,
  getSpendSeries,
  getTopMerchants,
} from "@/lib/analytics";
import { DEFAULT_ORG } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const orgId = sp.get("orgId") ?? DEFAULT_ORG.id;
  const days = Number(sp.get("days") ?? 14);

  return NextResponse.json({
    summary: getOrgSummary(orgId),
    spendSeries: getSpendSeries(orgId, days),
    denials: getDenialBreakdown(orgId),
    riskDistribution: getRiskDistribution(orgId),
    topMerchants: getTopMerchants(orgId),
    agentActivity: getAgentActivity(orgId),
  });
}