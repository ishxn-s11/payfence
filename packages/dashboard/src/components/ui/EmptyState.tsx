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
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="text-sm font-medium text-slate-600">{title}</div>
      {hint && <div className="max-w-md text-xs text-slate-500">{hint}</div>}
      {action}
    </div>
  );
}
