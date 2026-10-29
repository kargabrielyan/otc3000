const BUSINESS_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;
const CLOCK = /T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?/;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const HOME_TIMELINE_START_MS = 10 * HOUR_MS;
const EMPTY = "—";

export type SlicePlacementInput = {
  start: string;
  end: string | null;
  open: boolean;
  continuedFromPreviousDay: boolean;
  continuesBeyondDay: boolean;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function readBusinessDate(value: string): [number, number, number] | null {
  const match = BUSINESS_DATE.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }

  return [year, month, day];
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDuration(ms: number): string {
  const secondsTotal = Math.round(ms / 1000);
  if (secondsTotal <= 0) {
    return "0m";
  }

  const hours = Math.floor(secondsTotal / 3600);
  const minutes = Math.floor((secondsTotal % 3600) / 60);
  const seconds = secondsTotal % 60;

  if (hours >= 1) {
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }

  if (minutes >= 1) {
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function readClock(timestamp: string): [string, string, string] | null {
  const match = CLOCK.exec(timestamp);
  if (!match) {
    return null;
  }

  return [match[1] ?? "", match[2] ?? "", match[3] ?? ""];
}

export function formatSummaryClock(timestamp: string | null): string {
  if (timestamp === null) {
    return EMPTY;
  }

  const clock = readClock(timestamp);
  if (!clock) {
    return EMPTY;
  }

  return `${clock[0]}:${clock[1]}`;
}

export function formatTimelineClock(timestamp: string | null): string {
  if (timestamp === null) {
    return EMPTY;
  }

  const clock = readClock(timestamp);
  if (!clock) {
    return EMPTY;
  }

  return `${clock[0]}:${clock[1]}:${clock[2]}`;
}

export function formatMsSinceMidnight(ms: number | null): string {
  if (ms === null) {
    return EMPTY;
  }

  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${pad(hours)}:${pad(minutes)}`;
}

export function formatBusinessDate(date: string): string {
  const parsed = readBusinessDate(date);
  if (!parsed) {
    return date;
  }

  const [year, month, day] = parsed;
  const utc = utcDate(year, month, day);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(utc);
  const monthName = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
  }).format(utc);
  return `${weekday} ${day} ${monthName} ${year}`;
}

export function formatMonthHeading(monthKey: string): string {
  const match = MONTH_KEY.exec(monthKey);
  if (!match) {
    return monthKey;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return monthKey;
  }

  const monthName = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
  }).format(utcDate(year, month, 1));
  return `${monthName} ${year}`;
}

export function formatChartLabel(
  date: string,
  density: "weekday" | "day",
): string {
  const parsed = readBusinessDate(date);
  if (!parsed) {
    return date;
  }

  const [year, month, day] = parsed;
  if (density === "day") {
    return String(day);
  }

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(utcDate(year, month, day));
  return `${weekday} ${day}`;
}

export function businessTimeOfDayMs(timestamp: string): number | null {
  const match = CLOCK.exec(timestamp);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = match[4] ? Number(match[4]) : 0;
  if (
    hours > 23 ||
    minutes > 59 ||
    seconds > 59 ||
    millis > 999
  ) {
    return null;
  }

  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

function millisecondsOnDay(day: string, timestamp: string): number {
  const date = timestamp.slice(0, 10);
  if (date < day) {
    return 0;
  }
  if (date > day) {
    return DAY_MS;
  }

  return businessTimeOfDayMs(timestamp) ?? 0;
}

export function homeTimelineStartMs(day: {
  date: string;
  firstArrival: string | null;
  sessions: SlicePlacementInput[];
}): number {
  let earliest: number | null = null;

  if (day.firstArrival) {
    const arrival = businessTimeOfDayMs(day.firstArrival);
    if (arrival !== null) {
      earliest = arrival;
    }
  }

  for (const slice of day.sessions) {
    const start = slice.continuedFromPreviousDay
      ? 0
      : millisecondsOnDay(day.date, slice.start);
    if (earliest === null || start < earliest) {
      earliest = start;
    }
  }

  if (earliest === null || earliest >= HOME_TIMELINE_START_MS) {
    return HOME_TIMELINE_START_MS;
  }

  return Math.floor(earliest / HOUR_MS) * HOUR_MS;
}

export function slicePlacement(
  day: string,
  slice: SlicePlacementInput,
  nowTimestamp: string,
  windowStartMs = 0,
): { left: number; width: number } {
  const startMs = slice.continuedFromPreviousDay
    ? 0
    : millisecondsOnDay(day, slice.start);
  let endMs: number;
  if (slice.continuesBeyondDay) {
    endMs = DAY_MS;
  } else if (slice.open) {
    endMs = millisecondsOnDay(day, nowTimestamp);
  } else if (slice.end) {
    endMs = millisecondsOnDay(day, slice.end);
  } else {
    endMs = startMs;
  }

  const span = DAY_MS - windowStartMs;
  const leftMs = Math.min(DAY_MS, Math.max(windowStartMs, startMs));
  const rightMs = Math.min(DAY_MS, Math.max(leftMs, endMs));
  if (span <= 0) {
    return { left: 0, width: 0 };
  }

  return {
    left: (leftMs - windowStartMs) / span,
    width: (rightMs - leftMs) / span,
  };
}
