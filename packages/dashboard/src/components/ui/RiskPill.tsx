import { riskColor } from "@/lib/colors";

export function RiskPill({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-xs text-slate-400">—</span>;
  const color = riskColor(score);
  return (
    <span
      className="chip font-mono text-white"
      style={{
        background: color,
        boxShadow: `0 0 8px ${color}30`,
      }}
      title={`risk score ${score}`}
    >
      {score}
    </span>
  );
}
