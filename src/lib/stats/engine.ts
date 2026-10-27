import {
  decideTransition,
  statusFromLatestEvent,
  type OfficeStatus,
} from "../presence/transitions.ts";
import { BUSINESS_TIMEZONE, formatBusinessTimestamp } from "../timezone.ts";
import {
  addCalendarDays,
  businessDateFromInstant,
  enumerateBusinessDates,
  startInstantOfBusinessDate,
} from "./calendar.ts";
import type { DayStats, StatsEvent, StatsReport } from "./types.ts";

type Session = {
  enterAt: Date;
  exitAt: Date | null;
};

type Replay = {
  status: OfficeStatus;
  since: Date | null;
  sessions: Session[];
  recorded: StatsEvent[];
};

type SliceDraft = {
  start: Date;
  end: Date;
  officeMs: number;
  open: boolean;
  continuedFromPreviousDay: boolean;
  continuesBeyondDay: boolean;
};

type DayDraft = {
  stats: DayStats;
  arrivalOffsetMs: number | null;
  departureOffsetMs: number | null;
};

function compareEvents(left: StatsEvent, right: StatsEvent): number {
  const time = left.createdAt.getTime() - right.createdAt.getTime();
  if (time !== 0) {
    return time;
  }
  if (left.id < right.id) {
    return -1;
  }
  if (left.id > right.id) {
    return 1;
  }
  return 0;
}

function replay(prior: StatsEvent | null, subsequent: StatsEvent[]): Replay {
  let status = statusFromLatestEvent(prior ? prior.type : null);
  let since = prior ? prior.createdAt : null;
  let openEnter = prior && prior.type === "ENTER" ? prior.createdAt : null;
  const sessions: Session[] = [];
  const recorded: StatsEvent[] = [];

  if (prior) {
    recorded.push(prior);
  }

  for (const event of subsequent) {
    if (!decideTransition(status, event.type).record) {
      continue;
    }

    if (event.type === "ENTER") {
      openEnter = event.createdAt;
    } else if (openEnter) {
      sessions.push({ enterAt: openEnter, exitAt: event.createdAt });
      openEnter = null;
    }

    status = statusFromLatestEvent(event.type);
    since = event.createdAt;
    recorded.push(event);
  }

  if (openEnter) {
    sessions.push({ enterAt: openEnter, exitAt: null });
  }

  return { status, since, sessions, recorded };
}

function clipSession(
  session: Session,
  dayStart: Date,
  dayEnd: Date,
  now: Date,
): SliceDraft | null {
  const effectiveEnd = session.exitAt ?? now;
  const start =
    session.enterAt.getTime() > dayStart.getTime() ? session.enterAt : dayStart;
  const end =
    effectiveEnd.getTime() < dayEnd.getTime() ? effectiveEnd : dayEnd;
  const startMs = start.getTime();
  const endMs = end.getTime();
  if (endMs <= startMs) {
    return null;
  }

  const dayEndMs = dayEnd.getTime();
  const nowMs = now.getTime();
  const endsAtDayBoundary = endMs === dayEndMs;
  const continuesIntoNextDay =
    effectiveEnd.getTime() > dayEndMs ||
    (session.exitAt === null && effectiveEnd.getTime() === dayEndMs);

  return {
    start,
    end,
    officeMs: endMs - startMs,
    open: session.exitAt === null && endMs === nowMs && nowMs < dayEndMs,
    continuedFromPreviousDay: session.enterAt.getTime() < dayStart.getTime(),
    continuesBeyondDay: endsAtDayBoundary && continuesIntoNextDay,
  };
}

function buildDay(date: string, played: Replay, now: Date): DayDraft {
  const dayStart = startInstantOfBusinessDate(date);
  const dayEnd = startInstantOfBusinessDate(addCalendarDays(date, 1));
  const slices: SliceDraft[] = [];

  for (const session of played.sessions) {
    const slice = clipSession(session, dayStart, dayEnd, now);
    if (slice) {
      slices.push(slice);
    }
  }

  slices.sort((left, right) => left.start.getTime() - right.start.getTime());

  let firstArrival: Date | null = null;
  let lastExit: Date | null = null;
  let visits = 0;

  for (const event of played.recorded) {
    if (businessDateFromInstant(event.createdAt) !== date) {
      continue;
    }
    if (event.type === "ENTER") {
      visits += 1;
      if (!firstArrival) {
        firstArrival = event.createdAt;
      }
    } else {
      lastExit = event.createdAt;
    }
  }

  const officeMs = slices.reduce((sum, slice) => sum + slice.officeMs, 0);
  const firstSlice = slices[0];
  const lastSlice = slices[slices.length - 1];
  // Gaps between the day's office slices only. Time before the first slice
  // and after the last slice is not outside time.
  const outsideMs =
    firstSlice && lastSlice
      ? lastSlice.end.getTime() - firstSlice.start.getTime() - officeMs
      : 0;

  return {
    arrivalOffsetMs: firstArrival
      ? firstArrival.getTime() - dayStart.getTime()
      : null,
    departureOffsetMs: lastExit ? lastExit.getTime() - dayStart.getTime() : null,
    stats: {
      date,
      firstArrival: firstArrival ? formatBusinessTimestamp(firstArrival) : null,
      lastExit: lastExit ? formatBusinessTimestamp(lastExit) : null,
      officeMs,
      outsideMs,
      visits,
      sessions: slices.map((slice) => ({
        start: formatBusinessTimestamp(slice.start),
        end: slice.open ? null : formatBusinessTimestamp(slice.end),
        officeMs: slice.officeMs,
        open: slice.open,
        continuedFromPreviousDay: slice.continuedFromPreviousDay,
        continuesBeyondDay: slice.continuesBeyondDay,
      })),
    },
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

export function buildStatsReport(input: {
  events: readonly StatsEvent[];
  from: string;
  to: string;
  now: Date;
}): StatsReport {
  const nowMs = input.now.getTime();
  const rangeStartMs = startInstantOfBusinessDate(input.from).getTime();
  const eligible = input.events
    .filter((event) => event.createdAt.getTime() <= nowMs)
    .sort(compareEvents);

  let prior: StatsEvent | null = null;
  const subsequent: StatsEvent[] = [];
  for (const event of eligible) {
    if (event.createdAt.getTime() < rangeStartMs) {
      prior = event;
    } else {
      subsequent.push(event);
    }
  }

  const played = replay(prior, subsequent);
  const drafts = enumerateBusinessDates(input.from, input.to).map((date) =>
    buildDay(date, played, input.now),
  );
  const days = drafts.map((draft) => draft.stats);
  const officeMs = days.reduce((sum, day) => sum + day.officeMs, 0);
  const outsideMs = days.reduce((sum, day) => sum + day.outsideMs, 0);
  const visits = days.reduce((sum, day) => sum + day.visits, 0);
  const officeDays = days.filter((day) => day.officeMs > 0).length;
  const openSession = played.sessions.find((session) => session.exitAt === null);

  return {
    timezone: BUSINESS_TIMEZONE,
    from: input.from,
    to: input.to,
    generatedAt: formatBusinessTimestamp(input.now),
    status: played.status,
    since: played.since ? formatBusinessTimestamp(played.since) : null,
    currentSession: openSession
      ? {
          startedAt: formatBusinessTimestamp(openSession.enterAt),
          elapsedMs: nowMs - openSession.enterAt.getTime(),
        }
      : null,
    officeMs,
    outsideMs,
    visits,
    officeDays,
    averageArrivalMs: average(
      drafts.flatMap((draft) =>
        draft.arrivalOffsetMs === null ? [] : [draft.arrivalOffsetMs],
      ),
    ),
    averageDepartureMs: average(
      drafts.flatMap((draft) =>
        draft.departureOffsetMs === null ? [] : [draft.departureOffsetMs],
      ),
    ),
    averageOfficeMs: officeDays === 0 ? null : Math.round(officeMs / officeDays),
    days,
  };
}
