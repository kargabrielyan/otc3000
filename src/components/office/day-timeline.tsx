import {
  formatDuration,
  formatMsSinceMidnight,
  formatTimelineClock,
  slicePlacement,
} from "@/lib/format";
import type { DaySessionSlice, DayStats } from "@/lib/stats/types";
import { LiveDuration } from "@/components/office/live-duration";

function sliceNotes(slice: DaySessionSlice): string[] {
  const notes: string[] = [];
  if (slice.continuedFromPreviousDay) {
    notes.push("Continued from the previous day");
  }
  if (slice.continuesBeyondDay) {
    notes.push("Continues into the next day");
  }
  if (slice.open) {
    notes.push("Still in office");
  }
  return notes;
}

function sliceEndLabel(slice: DaySessionSlice, nowTimestamp: string): string {
  if (slice.continuesBeyondDay) {
    return "24:00:00";
  }
  if (slice.open) {
    return formatTimelineClock(nowTimestamp);
  }
  return formatTimelineClock(slice.end);
}

export function DayTimeline({
  day,
  nowTimestamp,
  startMs = 0,
}: {
  day: DayStats;
  nowTimestamp: string;
  startMs?: number;
}) {
  const middleMs = startMs + (86_400_000 - startMs) / 2;

  return (
    <div className="space-y-3">
      <div
        className="relative h-8 overflow-hidden rounded-md bg-muted"
        aria-hidden="true"
      >
        {day.sessions.map((slice, index) => {
          const place = slicePlacement(day.date, slice, nowTimestamp, startMs);
          if (place.width <= 0) {
            return null;
          }
          return (
            <span
              key={`${slice.start}-${index}`}
              className="absolute top-1 bottom-1 rounded-sm bg-office"
              style={{
                left: `${place.left * 100}%`,
                width: `${place.width * 100}%`,
                minWidth: "2px",
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{startMs === 0 ? "00:00" : formatMsSinceMidnight(startMs)}</span>
        <span>{startMs === 0 ? "12:00" : formatMsSinceMidnight(middleMs)}</span>
        <span>24:00</span>
      </div>
      {day.sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No office time this day.</p>
      ) : (
        <ol className="space-y-2 text-sm">
          {day.sessions.map((slice, index) => (
            <li
              key={`${slice.start}-${index}`}
              className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3"
            >
              <span className="tabular-nums">
                {formatTimelineClock(slice.start)}–{sliceEndLabel(slice, nowTimestamp)}
              </span>
              {slice.open ? (
                <LiveDuration
                  baseMs={slice.officeMs}
                  generatedAt={nowTimestamp}
                  live
                />
              ) : (
                <span className="tabular-nums">{formatDuration(slice.officeMs)}</span>
              )}
              {sliceNotes(slice).map((note) => (
                <span key={note} className="text-muted-foreground">
                  {note}
                </span>
              ))}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
