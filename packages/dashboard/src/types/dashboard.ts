import type { EnhancedSpendingGrant } from "@pay-fence/policy-engine";

export type GrantStatus = "active" | "expired" | "revoked";

export interface Agent {
  id: string;
  orgId: string;
  name: string;
  description: string;
  createdAt: string;
}

/** A grant as stored, with organization/agent metadata attached. */
export interface DashboardGrant extends EnhancedSpendingGrant {
  orgId: string;
  agentName: string;
  status: GrantStatus;
  createdAt: string;
  updatedAt: string;
}

/** Structured decision context persisted with each attempt for explanations. */
export interface DecisionDetail {
  spent?: { amount: string; currency: string };
  remaining?: { amount: string; currency: string };
  perPaymentLimit?: { amount: string; currency: string };
  frequencyUsage?: { windowMs: number; currentCount: number; maxCount: number };
  rollingWindow?: { windowMs: number; maxSpend: string };
  riskFactors?: { scorer: string; score: number; weight: number }[];
  purpose?: string;
}

export interface PaymentAttempt {
  id: string;
  orgId: string;
  grantId: string;
  agentId: string;
  agentName: string;
  merchant: string;
  amount: string;
  currency: string;
  purpose: string;
  allowed: boolean;
  reason: string;
  riskScore: number | null;
  transactionHash: string | null;
  rail: string;
  network: string;
  detail: DecisionDetail | null;
  createdAt: string;
}

export interface GrantUsage {
  grant: DashboardGrant;
  spent: string;
  remaining: string;
  currency: string;
  percentUsed: number;
  frequency: { windowMs: number; current: number; max: number }[];
  rolling: {
    windowMs: number;
    spent: string;
    max: string;
    txCurrent?: number;
    txMax?: number;
  }[];
  status: GrantStatus;
}

export interface OrgSummary {
  agentCount: number;
  activeGrantCount: number;
  totalSpent: string;
  currency: string;
  allowedAttempts: number;
  deniedAttempts: number;
  settledCount: number;
  attempts: number;
}