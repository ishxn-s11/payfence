import type { ReactNode } from "react";

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-header flex items-center justify-between">
          <span>{title}</span>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
