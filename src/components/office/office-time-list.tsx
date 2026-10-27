import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatBusinessDate, formatDuration } from "@/lib/format";
import type { OfficeTimePoint } from "@/components/office/chart-data";
import { focusRing } from "@/components/office/focus";

export function OfficeTimeList({
  points,
}: {
  points: readonly OfficeTimePoint[];
}) {
  return (
    <ul className="grid gap-1 text-sm sm:grid-cols-2">
      {points.map((point) => (
        <li key={point.date} className="min-w-0">
          <Link
            href={`/history/${point.date}`}
            className={cn(
              "flex items-baseline justify-between gap-3 rounded-md px-1 py-0.5",
              focusRing,
              point.future ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <span className="min-w-0 break-words">
              {formatBusinessDate(point.date)}
            </span>
            <span className="shrink-0 tabular-nums">
              {formatDuration(point.officeMs)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
