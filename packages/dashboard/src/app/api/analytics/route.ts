import { NextResponse } from "next/server";
import {
  getAgentActivity,
  getDenialBreakdown,
  getMonthlySpendSeries,
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
  const year = sp.get("year");
  const month = sp.get("month");

  const spendSeries =
    year && month
      ? getMonthlySpendSeries(orgId, Number(year), Number(month))
      : getSpendSeries(orgId, days);

  return NextResponse.json({
    summary: getOrgSummary(orgId),
    spendSeries,
    denials: getDenialBreakdown(orgId),
    riskDistribution: getRiskDistribution(orgId),
    topMerchants: getTopMerchants(orgId),
    agentActivity: getAgentActivity(orgId),
  });
}