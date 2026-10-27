import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { DayRows } from "@/components/office/day-rows";
import { focusRing } from "@/components/office/focus";
import { formatBusinessDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  addCalendarDays,
  businessDateFromInstant,
  resolveInclusiveRange,
} from "@/lib/stats/calendar";
import { firstQueryValue, loadOfficeReport, officeNow } from "@/lib/office";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "History",
};

type HistoryQuery = {
  from?: string | string[];
  to?: string | string[];
};

function fieldValue(value: string | null): string {
  return (value ?? "").slice(0, 32);
}

const fieldClass = cn(
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 font-mono text-sm tabular-nums sm:w-40",
  focusRing,
);

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<HistoryQuery>;
}) {
  const params = await searchParams;
  const now = await officeNow();
  const today = businessDateFromInstant(now);
  const requestedFrom = firstQueryValue(params.from);
  const requestedTo = firstQueryValue(params.to);
  const filtering = params.from !== undefined || params.to !== undefined;
  const range = filtering
    ? resolveInclusiveRange(requestedFrom, requestedTo)
    : { from: addCalendarDays(today, -29), to: today };
  const fromField = range ? range.from : fieldValue(requestedFrom);
  const toField = range ? range.to : fieldValue(requestedTo);
  const report = range
    ? await loadOfficeReport(range.from, range.to, now)
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">History</h1>
        {range ? (
          <p className="text-sm text-muted-foreground">
            {formatBusinessDate(range.from)} – {formatBusinessDate(range.to)}
          </p>
        ) : (
          <p role="alert" className="text-sm">
            That range is invalid.
          </p>
        )}
      </div>

      <form action="/history" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid min-w-0 gap-1 text-sm">
          From
          <input
            name="from"
            defaultValue={fromField}
            autoComplete="off"
            spellCheck={false}
            className={fieldClass}
          />
        </label>
        <label className="grid min-w-0 gap-1 text-sm">
          To
          <input
            name="to"
            defaultValue={toField}
            autoComplete="off"
            spellCheck={false}
            className={fieldClass}
          />
        </label>
        <Button type="submit">Show</Button>
      </form>

      {report ? <DayRows days={report.days} /> : null}
    </div>
  );
}
