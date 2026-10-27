import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration, formatSummaryClock } from "@/lib/format";
import type { DayStats } from "@/lib/stats/types";
import { LiveDuration } from "@/components/office/live-duration";

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function DayFigures({
  day,
  generatedAt,
  liveOffice,
}: {
  day: DayStats;
  generatedAt: string;
  liveOffice: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Stat
        label="Office"
        value={
          <LiveDuration
            baseMs={day.officeMs}
            generatedAt={generatedAt}
            live={liveOffice}
          />
        }
      />
      <Stat label="Outside" value={formatDuration(day.outsideMs)} />
      <Stat label="First arrival" value={formatSummaryClock(day.firstArrival)} />
      <Stat label="Last exit" value={formatSummaryClock(day.lastExit)} />
      <Stat label="Visits" value={String(day.visits)} />
    </div>
  );
}
