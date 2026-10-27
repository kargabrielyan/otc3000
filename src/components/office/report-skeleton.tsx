export function ReportSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
