import type { ReactNode } from "react";

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center gap-5 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-10 py-20 text-center">
      {/* Subtle corner accents */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-40"
        style={{
          background:
            "radial-gradient(200px 150px at 20% 20%, rgba(255, 72, 139, 0.06), transparent 70%), radial-gradient(200px 150px at 80% 80%, rgba(144, 170, 222, 0.06), transparent 70%)",
        }}
      />
      <div className="relative text-[0.9375rem] font-bold text-[var(--text-secondary)]">{title}</div>
      {hint && (
        <div className="relative max-w-lg text-[0.8125rem] leading-relaxed text-[var(--text-muted)]">{hint}</div>
      )}
      {action && <div className="relative">{action}</div>}
    </div>
  );
}
