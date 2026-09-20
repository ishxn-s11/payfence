export function TxHash({ hash }: { hash: string | null }) {
  if (!hash) return <span className="text-xs text-[var(--text-faint)]">—</span>;
  return (
    <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-muted)]" title={hash}>
      {hash.slice(0, 12)}…
    </span>
  );
}
