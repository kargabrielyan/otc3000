import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatBusinessDate, formatDuration, formatSummaryClock } from "@/lib/format";
import type { DayStats } from "@/lib/stats/types";
import { focusRing } from "@/components/office/focus";

const dateLink = cn(
  "underline decoration-border underline-offset-4",
  focusRing,
);

export function DayRows({ days }: { days: readonly DayStats[] }) {
  return (
    <>
      <ul className="divide-y divide-border md:hidden">
        {days.map((day) => (
          <li key={day.date}>
            <Link
              href={`/history/${day.date}`}
              className={cn("block rounded-md py-3", focusRing)}
            >
              <span className="block font-medium break-words">
                {formatBusinessDate(day.date)}
              </span>
              <span className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <span className="min-w-0">
                  Arrival {formatSummaryClock(day.firstArrival)}
                </span>
                <span className="min-w-0">
                  Exit {formatSummaryClock(day.lastExit)}
                </span>
                <span>Office {formatDuration(day.officeMs)}</span>
                <span>Visits {day.visits}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%] whitespace-normal">Date</TableHead>
              <TableHead className="whitespace-normal">First arrival</TableHead>
              <TableHead className="whitespace-normal">Last exit</TableHead>
              <TableHead className="whitespace-normal">Office time</TableHead>
              <TableHead className="whitespace-normal">Visits</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => (
              <TableRow key={day.date}>
                <TableCell className="whitespace-normal break-words">
                  <Link href={`/history/${day.date}`} className={dateLink}>
                    {formatBusinessDate(day.date)}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-normal tabular-nums">
                  {formatSummaryClock(day.firstArrival)}
                </TableCell>
                <TableCell className="whitespace-normal tabular-nums">
                  {formatSummaryClock(day.lastExit)}
                </TableCell>
                <TableCell className="whitespace-normal tabular-nums">
                  {formatDuration(day.officeMs)}
                </TableCell>
                <TableCell className="whitespace-normal tabular-nums">
                  {day.visits}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
