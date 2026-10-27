import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  formatBusinessDate,
  formatChartLabel,
  formatDuration,
  formatSummaryClock,
} from "@/lib/format";
import type { DayStats } from "@/lib/stats/types";
import { focusRing } from "@/components/office/focus";
import { LiveDuration } from "@/components/office/live-duration";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function dayLabel(options: {
  date: string;
  outside: boolean;
  isToday: boolean;
  future: boolean;
  inOffice: boolean;
  day: DayStats | undefined;
}): string {
  const parts = [formatBusinessDate(options.date)];
  if (options.outside) {
    parts.push("outside this month");
  }
  if (options.isToday) {
    parts.push("today");
  }
  if (options.isToday && options.inOffice) {
    parts.push("in office");
  }
  if (!options.future) {
    if (!options.day || options.day.officeMs === 0) {
      parts.push("no office time");
    } else {
      parts.push(`office ${formatDuration(options.day.officeMs)}`);
      parts.push(`arrival ${formatSummaryClock(options.day.firstArrival)}`);
      parts.push(`departure ${formatSummaryClock(options.day.lastExit)}`);
    }
  }
  return parts.join(", ");
}

export function CalendarGrid({
  dates,
  days,
  today,
  monthFrom,
  monthTo,
  inOffice,
  generatedAt,
}: {
  dates: readonly string[];
  days: readonly DayStats[];
  today: string;
  monthFrom: string;
  monthTo: string;
  inOffice: boolean;
  generatedAt: string;
}) {
  const byDate = new Map(days.map((day) => [day.date, day]));

  return (
    <div className="grid w-full min-w-0 grid-cols-7 gap-1">
      {WEEKDAYS.map((weekday) => (
        <div
          key={weekday}
          className="px-0.5 text-center text-[10px] font-medium text-muted-foreground sm:text-xs"
        >
          {weekday}
        </div>
      ))}
      {dates.map((date) => {
        const day = byDate.get(date);
        const outside = date < monthFrom || date > monthTo;
        const future = date > today;
        const isToday = date === today;
        const openToday = isToday && inOffice;
        const quiet = !future && (!day || day.officeMs === 0) && !openToday;
        return (
          <Link
            key={date}
            href={`/history/${date}`}
            aria-current={isToday ? "date" : undefined}
            aria-label={dayLabel({
              date,
              outside,
              isToday,
              future,
              inOffice,
              day,
            })}
            className={cn(
              "flex min-h-16 min-w-0 flex-col items-center gap-0.5 rounded-md p-1 text-center text-[10px] leading-tight break-words sm:text-xs",
              focusRing,
              outside
                ? "border border-dashed border-border text-muted-foreground"
                : "border border-transparent",
              isToday ? "ring-2 ring-foreground" : "",
            )}
          >
            <span className="text-sm leading-none font-medium tabular-nums">
              {formatChartLabel(date, "day")}
            </span>
            {isToday ? <span className="font-medium">Today</span> : null}
            {openToday ? <span className="text-office">In office</span> : null}
            {future ? null : quiet ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <>
                <span className="tabular-nums">
                  {openToday && day ? (
                    <LiveDuration
                      baseMs={day.officeMs}
                      generatedAt={generatedAt}
                      live
                    />
                  ) : (
                    formatDuration(day?.officeMs ?? 0)
                  )}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatSummaryClock(day?.firstArrival ?? null)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatSummaryClock(day?.lastExit ?? null)}
                </span>
              </>
            )}
          </Link>
        );
      })}
    </div>
  );
}
