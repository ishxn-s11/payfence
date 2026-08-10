export function TxHash({ hash }: { hash: string | null }) {
  if (!hash) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className="font-mono text-xs text-slate-500" title={hash}>
      {hash.slice(0, 12)}…
    </span>
  );
}
