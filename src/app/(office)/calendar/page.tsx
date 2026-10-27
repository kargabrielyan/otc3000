import type { Metadata } from "next";
import Link from "next/link";
import { CalendarGrid } from "@/components/office/calendar-grid";
import { currentLink, focusRing, idleLink } from "@/components/office/focus";
import { cn } from "@/lib/utils";
import { formatMonthHeading } from "@/lib/format";
import {
  businessDateFromInstant,
  calendarMonthContaining,
  enumerateBusinessDates,
  mondayWeekContaining,
} from "@/lib/stats/calendar";
import {
  firstQueryValue,
  isMonthKey,
  loadOfficeReport,
  officeNow,
  shiftMonthKey,
} from "@/lib/office";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calendar",
};

type CalendarQuery = {
  month?: string | string[];
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<CalendarQuery>;
}) {
  const params = await searchParams;
  const monthParam = firstQueryValue(params.month);
  if (monthParam !== null && !isMonthKey(monthParam)) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-medium">Calendar</h1>
        <p>That month is invalid.</p>
        <Link
          href="/calendar"
          className={cn(
            "inline-flex rounded-md px-2.5 py-1.5 text-sm",
            focusRing,
            idleLink,
          )}
        >
          Back to the current month
        </Link>
      </div>
    );
  }

  const now = await officeNow();
  const today = businessDateFromInstant(now);
  const monthKey = monthParam ?? today.slice(0, 7);
  const month = calendarMonthContaining(`${monthKey}-01`);
  const from = mondayWeekContaining(month.from).from;
  const to = mondayWeekContaining(month.to).to;
  const report = await loadOfficeReport(from, to, now);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-medium">{formatMonthHeading(monthKey)}</h1>
        <nav aria-label="Months" className="flex flex-wrap gap-1">
          <Link
            href={`/calendar?month=${shiftMonthKey(monthKey, -1)}`}
            className={cn("rounded-md px-2.5 py-1.5 text-sm", focusRing, idleLink)}
          >
            Previous month
          </Link>
          <Link
            href={`/calendar?month=${shiftMonthKey(monthKey, 1)}`}
            className={cn("rounded-md px-2.5 py-1.5 text-sm", focusRing, idleLink)}
          >
            Next month
          </Link>
        </nav>
      </div>
      {monthKey !== today.slice(0, 7) ? (
        <Link
          href="/calendar"
          className={cn("inline-flex rounded-md px-2.5 py-1.5 text-sm", focusRing, currentLink)}
        >
          Current month
        </Link>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Office time, arrival, and departure. A dash means no office time.
      </p>
      <CalendarGrid
        dates={enumerateBusinessDates(from, to)}
        days={report.days}
        today={today}
        monthFrom={month.from}
        monthTo={month.to}
        inOffice={report.status === "IN_OFFICE"}
        generatedAt={report.generatedAt}
      />
    </div>
  );
}
