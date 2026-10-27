import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OfficeStatus } from "@/lib/presence/transitions";

export function statusLabel(status: OfficeStatus): string {
  return status === "IN_OFFICE" ? "In office" : "Out of office";
}

export function StatusBadge({ status }: { status: OfficeStatus }) {
  const inOffice = status === "IN_OFFICE";
  return (
    <Badge
      variant="outline"
      className={cn(
        inOffice
          ? "border-office/40 bg-office/15 text-office"
          : "text-muted-foreground",
      )}
    >
      {statusLabel(status)}
    </Badge>
  );
}
