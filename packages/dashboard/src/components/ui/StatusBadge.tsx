export function StatusBadge({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <span className="chip bg-green-50 text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      Allowed
    </span>
  ) : (
    <span className="chip bg-red-50 text-red-700">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
      Denied
    </span>
  );
}
