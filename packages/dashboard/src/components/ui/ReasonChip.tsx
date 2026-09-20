export function ReasonChip({ reason }: { reason: string }) {
  return (
    <span className="chip bg-[var(--surface-2)] text-[var(--text-muted)] font-mono border border-[var(--border)]">
      {reason}
    </span>
  );
}
