import type { Metadata } from "next";
import {
  addCalendarDays,
  businessDateFromInstant,
  mondayWeekContaining,
} from "@/lib/stats/calendar";
import {
  formatBusinessDate,
  formatSummaryClock,
  homeTimelineStartMs,
} from "@/lib/format";
import { loadOfficeReport, officeNow } from "@/lib/office";
import { toOfficePoints } from "@/components/office/chart-data";
import { OfficeTimeChart } from "@/components/office/charts";
import { OfficeTimeList } from "@/components/office/office-time-list";
import { DayFigures } from "@/components/office/day-figures";
import { DayRows } from "@/components/office/day-rows";
import { DayTimeline } from "@/components/office/day-timeline";
import { LiveDuration } from "@/components/office/live-duration";
import { StatusBadge } from "@/components/office/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const now = await officeNow();
  const today = businessDateFromInstant(now);
  const week = mondayWeekContaining(today);
  const recentFrom = addCalendarDays(today, -13);
  const report = await loadOfficeReport(recentFrom, week.to, now);
  const todayStats = report.days.find((day) => day.date === today);
  if (!todayStats) {
    throw new Error("The report could not be loaded.");
  }

  const weekDays = report.days.filter(
    (day) => day.date >= week.from && day.date <= week.to,
  );
  const recentDays = report.days
    .filter((day) => day.date <= today)
    .toReversed();
  const inOffice = report.status === "IN_OFFICE";
  const points = toOfficePoints(weekDays, today, "weekday");
  const sinceDate = report.since ? report.since.slice(0, 10) : null;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-medium">{formatBusinessDate(today)}</h1>
          <StatusBadge status={report.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Since {formatSummaryClock(report.since)}
          {sinceDate ? ` · ${formatBusinessDate(sinceDate)}` : ""}
        </p>
        {report.currentSession ? (
          <p className="text-sm">
            Current visit{" "}
            <LiveDuration
              baseMs={report.currentSession.elapsedMs}
              generatedAt={report.generatedAt}
              live
            />
          </p>
        ) : null}
      </header>

      <DayFigures
        day={todayStats}
        generatedAt={report.generatedAt}
        liveOffice={inOffice}
      />

      <section className="space-y-3">
        <h2 className="text-base font-medium">Timeline</h2>
        <DayTimeline
          day={todayStats}
          nowTimestamp={report.generatedAt}
          startMs={homeTimelineStartMs(todayStats)}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">This week</h2>
        <p className="text-sm text-muted-foreground">
          {formatBusinessDate(week.from)} – {formatBusinessDate(week.to)}
        </p>
        <OfficeTimeChart points={points} />
        <OfficeTimeList points={points} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Recent days</h2>
        <DayRows days={recentDays} />
      </section>
    </div>
  );
}
