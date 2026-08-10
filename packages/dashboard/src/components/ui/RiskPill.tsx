import { riskColor } from "@/lib/colors";

export function RiskPill({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span
      className="chip font-mono text-white"
      style={{ background: riskColor(score) }}
      title={`risk score ${score}`}
    >
      {score}
    </span>
  );
}
