"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { Agent, DashboardGrant } from "@/types/dashboard";

const WINDOW_PRESETS = [
  { label: "1 min", ms: 60_000 },
  { label: "5 min", ms: 300_000 },
  { label: "1 hour", ms: 3_600_000 },
  { label: "6 hours", ms: 21_600_000 },
  { label: "1 day", ms: 86_400_000 },
  { label: "7 days", ms: 604_800_000 },
];

const SCORER_TYPES = [
  { type: "amount", label: "Amount", hint: "payment size vs limit" },
  { type: "velocity", label: "Velocity", hint: "recent transaction count" },
  { type: "merchant", label: "Merchant", hint: "reputation / allowlist" },
];

interface ScorerRow {
  type: string;
  weight: number;
}

interface FormState {
  agentId: string;
  status: "active" | "revoked" | "expired";
  totalAmount: string;
  currency: string;
  perLimitEnabled: boolean;
  perLimitAmount: string;
  merchants: string;
  purposes: string;
  frequency: { windowMs: number; maxTx: number; perMerchant: boolean; perPurpose: boolean }[];
  rolling: { windowMs: number; maxSpend: string; maxTx: string }[];
  riskEnabled: boolean;
  riskMax: number;
  scorers: ScorerRow[];
  expiresAt: string;
}

function defaultState(initial?: DashboardGrant): FormState {
  return {
    agentId: initial?.agentId ?? "",
    status: initial?.status ?? "active",
    totalAmount: initial?.totalBudget.amount ?? "10",
    currency: initial?.totalBudget.currency ?? "USDC",
    perLimitEnabled: !!initial?.perPaymentLimit,
    perLimitAmount: initial?.perPaymentLimit?.amount ?? "1",
    merchants: initial?.allowedMerchants?.join(", ") ?? "",
    purposes: initial?.allowedPurposes?.join(", ") ?? "",
    frequency: (initial?.frequencyLimits ?? []).map((f) => ({
      windowMs: f.windowMs,
      maxTx: f.maxTransactions,
      perMerchant: !!f.perMerchant,
      perPurpose: !!f.perPurpose,
    })),
    rolling: (initial?.rollingWindows ?? []).map((r) => ({
      windowMs: r.windowMs,
      maxSpend: r.maxSpend.amount,
      maxTx: r.maxTransactions != null ? String(r.maxTransactions) : "",
    })),
    riskEnabled: !!initial?.riskPolicy,
    riskMax: initial?.riskPolicy?.maxRiskScore ?? 50,
    scorers: (initial?.riskPolicy?.scorers ?? []).map((s) => ({
      type: s.type,
      weight: s.weight,
    })),
    expiresAt: initial?.expiresAt ? initial.expiresAt.slice(0, 10) : "",
  };
}

export function GrantForm({
  agents,
  initial,
  onSaved,
  onCancel,
}: {
  agents: Agent[];
  initial?: DashboardGrant;
  onSaved: (grant: DashboardGrant) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [form, setForm] = useState<FormState>(() => defaultState(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addFrequency = () =>
    set("frequency", [
      ...form.frequency,
      { windowMs: 60_000, maxTx: 5, perMerchant: false, perPurpose: false },
    ]);
  const addRolling = () =>
    set("rolling", [...form.rolling, { windowMs: 86_400_000, maxSpend: "10", maxTx: "" }]);

  const toggleScorer = (type: string, weight: number) => {
    const exists = form.scorers.some((s) => s.type === type);
    set(
      "scorers",
      exists ? form.scorers.filter((s) => s.type !== type) : [...form.scorers, { type, weight }],
    );
  };

  const setScorerWeight = (type: string, weight: number) =>
    set(
      "scorers",
      form.scorers.map((s) => (s.type === type ? { ...s, weight } : s)),
    );

  const payload = useMemo(() => {
    const merchants = form.merchants.split(",").map((m) => m.trim()).filter(Boolean);
    const purposes = form.purposes.split(",").map((p) => p.trim()).filter(Boolean);
    const body: Record<string, unknown> = {
      agentId: form.agentId,
      status: form.status,
      totalBudget: { amount: form.totalAmount, currency: form.currency },
      allowedMerchants: merchants,
      allowedPurposes: purposes,
      frequencyLimits: form.frequency
        .filter((f) => f.maxTx > 0)
        .map((f) => ({
          windowMs: f.windowMs,
          maxTransactions: f.maxTx,
          ...(f.perMerchant ? { perMerchant: true } : {}),
          ...(f.perPurpose ? { perPurpose: true } : {}),
        })),
      rollingWindows: form.rolling
        .filter((r) => r.maxSpend)
        .map((r) => ({
          windowMs: r.windowMs,
          maxSpend: { amount: r.maxSpend, currency: form.currency },
          ...(r.maxTx ? { maxTransactions: Number(r.maxTx) } : {}),
        })),
      expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59.999Z`).toISOString() : undefined,
    };
    if (form.perLimitEnabled) {
      body.perPaymentLimit = { amount: form.perLimitAmount, currency: form.currency };
    } else if (isEdit) {
      body.perPaymentLimit = null;
    }
    if (form.riskEnabled) {
      body.riskPolicy = {
        maxRiskScore: form.riskMax,
        scorers: form.scorers.filter((s) => s.weight > 0),
      };
    } else if (isEdit) {
      body.riskPolicy = null;
    }
    return body;
  }, [form, isEdit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.agentId) return setError("Select an agent.");
    if (!form.totalAmount || Number(form.totalAmount) <= 0)
      return setError("Total budget must be greater than zero.");
    setSaving(true);
    try {
      const res = isEdit
        ? await api<{ grant: DashboardGrant }>(`/api/grants/${initial!.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await api<{ grant: DashboardGrant }>("/api/grants", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      onSaved(res.grant);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save grant");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Agent</label>
          <select
            className="input"
            value={form.agentId}
            onChange={(e) => set("agentId", e.target.value)}
            required
          >
            <option value="">Select agent…</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={form.status}
            onChange={(e) => set("status", e.target.value as FormState["status"])}
          >
            <option value="active">active</option>
            <option value="revoked">revoked</option>
            <option value="expired">expired</option>
          </select>
        </div>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">Budget & limits</legend>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Total budget</label>
            <input
              className="input"
              inputMode="decimal"
              value={form.totalAmount}
              onChange={(e) => set("totalAmount", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Currency</label>
            <input className="input" value={form.currency} onChange={(e) => set("currency", e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="label flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.perLimitEnabled}
                  onChange={(e) => set("perLimitEnabled", e.target.checked)}
                />
                Per-payment limit
              </label>
              <input
                className="input"
                disabled={!form.perLimitEnabled}
                inputMode="decimal"
                value={form.perLimitAmount}
                onChange={(e) => set("perLimitAmount", e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Merchant allowlist (comma-separated)</label>
            <input
              className="input"
              placeholder="data.example.com, inference.example.com"
              value={form.merchants}
              onChange={(e) => set("merchants", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Purpose allowlist (comma-separated)</label>
            <input
              className="input"
              placeholder="research, fetch, purchase"
              value={form.purposes}
              onChange={(e) => set("purposes", e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Frequency limits <span className="font-normal text-slate-400">(rate limiting)</span>
        </legend>
        {form.frequency.length === 0 && (
          <p className="text-xs text-slate-400">No rate limits — payments are uncapped in rate.</p>
        )}
        {form.frequency.map((fl, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label">Window</label>
              <select
                className="input w-36"
                value={fl.windowMs}
                onChange={(e) =>
                  set("frequency", form.frequency.map((f, j) => (j === i ? { ...f, windowMs: Number(e.target.value) } : f)))
                }
              >
                {WINDOW_PRESETS.map((p) => (
                  <option key={p.ms} value={p.ms}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Max transactions</label>
              <input
                className="input w-28"
                type="number"
                min={1}
                value={fl.maxTx}
                onChange={(e) =>
                  set("frequency", form.frequency.map((f, j) => (j === i ? { ...f, maxTx: Number(e.target.value) } : f)))
                }
              />
            </div>
            <label className="flex items-center gap-1 pb-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={fl.perMerchant}
                onChange={(e) =>
                  set("frequency", form.frequency.map((f, j) => (j === i ? { ...f, perMerchant: e.target.checked } : f)))
                }
              />
              per merchant
            </label>
            <label className="flex items-center gap-1 pb-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={fl.perPurpose}
                onChange={(e) =>
                  set("frequency", form.frequency.map((f, j) => (j === i ? { ...f, perPurpose: e.target.checked } : f)))
                }
              />
              per purpose
            </label>
            <button
              type="button"
              className="btn btn-ghost pb-2 text-xs text-red-600"
              onClick={() => set("frequency", form.frequency.filter((_, j) => j !== i))}
            >
              remove
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary" onClick={addFrequency}>
          + Add rate limit
        </button>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">Rolling window budgets</legend>
        {form.rolling.length === 0 && (
          <p className="text-xs text-slate-400">No rolling windows — only the lifetime budget applies.</p>
        )}
        {form.rolling.map((rw, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label">Window</label>
              <select
                className="input w-36"
                value={rw.windowMs}
                onChange={(e) =>
                  set("rolling", form.rolling.map((r, j) => (j === i ? { ...r, windowMs: Number(e.target.value) } : r)))
                }
              >
                {WINDOW_PRESETS.map((p) => (
                  <option key={p.ms} value={p.ms}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Max spend in window</label>
              <input
                className="input w-28"
                inputMode="decimal"
                value={rw.maxSpend}
                onChange={(e) =>
                  set("rolling", form.rolling.map((r, j) => (j === i ? { ...r, maxSpend: e.target.value } : r)))
                }
              />
            </div>
            <div>
              <label className="label">Max transactions (optional)</label>
              <input
                className="input w-28"
                inputMode="numeric"
                placeholder="none"
                value={rw.maxTx}
                onChange={(e) =>
                  set("rolling", form.rolling.map((r, j) => (j === i ? { ...r, maxTx: e.target.value } : r)))
                }
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost pb-2 text-xs text-red-600"
              onClick={() => set("rolling", form.rolling.filter((_, j) => j !== i))}
            >
              remove
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary" onClick={addRolling}>
          + Add rolling window
        </button>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">Risk policy</legend>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.riskEnabled}
            onChange={(e) => set("riskEnabled", e.target.checked)}
          />
          Enable risk scoring
        </label>
        {form.riskEnabled && (
          <div className="space-y-3">
            <div>
              <label className="label">
                Block above risk score: <span className="font-semibold">{form.riskMax}</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.riskMax}
                onChange={(e) => set("riskMax", Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-500">Scorers & weights</div>
              {SCORER_TYPES.map((s) => {
                const active = form.scorers.some((x) => x.type === s.type);
                return (
                  <div key={s.type} className="flex items-center gap-3">
                    <label className="flex w-40 items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={active} onChange={() => toggleScorer(s.type, 0.5)} />
                      {s.label}
                    </label>
                    <span className="hidden text-xs text-slate-400 sm:inline">{s.hint}</span>
                    <input
                      className="input w-24"
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      disabled={!active}
                      value={form.scorers.find((x) => x.type === s.type)?.weight ?? 0.5}
                      onChange={(e) => setScorerWeight(s.type, Number(e.target.value))}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Expires (optional)</label>
          <input
            type="date"
            className="input"
            value={form.expiresAt}
            onChange={(e) => set("expiresAt", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create grant"}
        </button>
      </div>
    </form>
  );
}