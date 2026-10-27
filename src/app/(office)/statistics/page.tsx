import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrivalChart, OfficeTimeChart } from "@/components/office/charts";
import { toArrivalPoints, toOfficePoints } from "@/components/office/chart-data";
import { currentLink, focusRing, idleLink } from "@/components/office/focus";
import { OfficeTimeList } from "@/components/office/office-time-list";
import { cn } from "@/lib/utils";
import {
  formatBusinessDate,
  formatDuration,
  formatMonthHeading,
  formatMsSinceMidnight,
} from "@/lib/format";
import { firstQueryValue, loadOfficeReport, officeNow } from "@/lib/office";
import {
  addCalendarDays,
  businessDateFromInstant,
  calendarMonthContaining,
  mondayWeekContaining,
} from "@/lib/stats/calendar";
import type { StatsReport } from "@/lib/stats/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Statistics",
};

type StatisticsQuery = {
  period?: string | string[];
};

function durationOrDash(ms: number | null): string {
  return ms === null ? "—" : formatDuration(ms);
}

function SummaryCard({
  title,
  report,
  children,
}: {
  title: string;
  report: StatsReport;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {formatBusinessDate(report.from)} – {formatBusinessDate(report.to)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
          <div className="min-w-0">
            <dt className="text-muted-foreground">Office</dt>
            <dd className="tabular-nums">{formatDuration(report.officeMs)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Outside</dt>
            <dd className="tabular-nums">{formatDuration(report.outsideMs)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Visits</dt>
            <dd className="tabular-nums">{report.visits}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Office days</dt>
            <dd className="tabular-nums">{report.officeDays}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Average arrival</dt>
            <dd className="tabular-nums">
              {formatMsSinceMidnight(report.averageArrivalMs)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Average departure</dt>
            <dd className="tabular-nums">
              {formatMsSinceMidnight(report.averageDepartureMs)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Average office</dt>
            <dd className="tabular-nums">
              {durationOrDash(report.averageOfficeMs)}
            </dd>
          </div>
        </dl>
        {children}
      </CardContent>
    </Card>
  );
}

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<StatisticsQuery>;
}) {
  const params = await searchParams;
  const period = firstQueryValue(params.period) === "week" ? "week" : "month";
  const now = await officeNow();
  const today = businessDateFromInstant(now);
  const week = mondayWeekContaining(today);
  const month = calendarMonthContaining(today);
  const previous = calendarMonthContaining(addCalendarDays(month.from, -1));
  const [weekReport, monthReport, previousReport] = await Promise.all([
    loadOfficeReport(week.from, week.to, now),
    loadOfficeReport(month.from, month.to, now),
    loadOfficeReport(previous.from, previous.to, now),
  ]);
  const selected = period === "week" ? weekReport : monthReport;
  const density = period === "week" ? "weekday" : "day";
  const officePoints = toOfficePoints(selected.days, today, density);
  const arrivals = toArrivalPoints(selected.days, today, density);
  const previousHeading = formatMonthHeading(previous.from.slice(0, 7));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-medium">Statistics</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryCard title="This week" report={weekReport} />
        <SummaryCard title="This month" report={monthReport}>
          <p className="text-sm text-muted-foreground break-words">
            Previous month, {previousHeading}:{" "}
            {formatDuration(previousReport.officeMs)} office,{" "}
            {previousReport.officeDays} office days, average{" "}
            {durationOrDash(previousReport.averageOfficeMs)}.
          </p>
        </SummaryCard>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium">Daily office time</h2>
          <nav aria-label="Chart period" className="flex flex-wrap gap-1">
            <Link
              href="/statistics?period=week"
              aria-current={period === "week" ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm",
                focusRing,
                period === "week" ? currentLink : idleLink,
              )}
            >
              Week
            </Link>
            <Link
              href="/statistics?period=month"
              aria-current={period === "month" ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm",
                focusRing,
                period === "month" ? currentLink : idleLink,
              )}
            >
              Month
            </Link>
          </nav>
        </div>
        <OfficeTimeChart points={officePoints} />
        <OfficeTimeList points={officePoints} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Arrivals</h2>
        <p className="text-sm text-muted-foreground">
          Clock time in Asia/Yerevan.
        </p>
        {arrivals.length < 2 ? (
          arrivals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No arrivals in this period.
            </p>
          ) : (
            <p className="text-sm">
              {arrivals[0]?.fullDate} arrival {arrivals[0]?.clock}
            </p>
          )
        ) : (
          <ArrivalChart points={arrivals} />
        )}
      </section>
    </div>
  );
}
