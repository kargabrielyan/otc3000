import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DayFigures } from "@/components/office/day-figures";
import { DayTimeline } from "@/components/office/day-timeline";
import { focusRing } from "@/components/office/focus";
import { LiveDuration } from "@/components/office/live-duration";
import { StatusBadge } from "@/components/office/status-badge";
import { formatBusinessDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { loadOfficeReport, officeNow } from "@/lib/office";
import {
  businessDateFromInstant,
  isBusinessDate,
} from "@/lib/stats/calendar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Day",
};

export default async function HistoryDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isBusinessDate(date)) {
    notFound();
  }

  const now = await officeNow();
  const today = businessDateFromInstant(now);
  const report = await loadOfficeReport(date, date, now);
  const day = report.days[0];
  if (!day) {
    throw new Error("The report could not be loaded.");
  }

  const isToday = date === today;
  const inOffice = report.status === "IN_OFFICE";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm">
          <Link
            href="/history"
            className={cn("underline decoration-border underline-offset-4", focusRing)}
          >
            History
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-medium">{formatBusinessDate(date)}</h1>
          {isToday ? <StatusBadge status={report.status} /> : null}
        </div>
        {isToday && report.currentSession ? (
          <p className="text-sm">
            Current visit{" "}
            <LiveDuration
              baseMs={report.currentSession.elapsedMs}
              generatedAt={report.generatedAt}
              live
            />
          </p>
        ) : null}
      </div>
      <DayFigures
        day={day}
        generatedAt={report.generatedAt}
        liveOffice={isToday && inOffice}
      />
      <DayTimeline day={day} nowTimestamp={report.generatedAt} />
    </div>
  );
}
