import {
  BUSINESS_TIMEZONE,
  formatBusinessTimestamp,
} from "../timezone.ts";
import type { BusinessDateRange } from "./types.ts";

export const MAX_INCLUSIVE_DAYS = 366;

const BUSINESS_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const OFFSET = /([+-])(\d{2}):(\d{2})$/;
const CIVIL_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;

const MONDAY_OFFSET: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function readBusinessDate(value: string): [number, number, number] | null {
  const match = BUSINESS_DATE.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return [year, month, day];
}

function requireBusinessDate(value: string): [number, number, number] {
  const parsed = readBusinessDate(value);
  if (!parsed) {
    throw new Error("Invalid business date");
  }
  return parsed;
}

export function isBusinessDate(value: string): boolean {
  return readBusinessDate(value) !== null;
}

function formatIsoDate(year: number, month: number, day: number): string {
  const paddedMonth = String(month).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${paddedMonth}-${paddedDay}`;
}

function offsetMs(instant: Date): number {
  const match = OFFSET.exec(formatBusinessTimestamp(instant));
  if (!match) {
    throw new Error("Missing business timezone offset");
  }

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  return sign * (hours * 60 + minutes) * 60_000;
}

function civilClockUtcMillis(instant: Date): number {
  const match = CIVIL_TIME.exec(formatBusinessTimestamp(instant));
  if (!match) {
    throw new Error("Unreadable business timestamp");
  }

  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
    Number(match[7]),
  );
}

function alignToCivilTime(utcMillis: number, civilUtc: number): Date | null {
  const instant = new Date(utcMillis);
  const seen = civilClockUtcMillis(instant);
  if (seen === civilUtc) {
    return instant;
  }

  const adjusted = new Date(utcMillis - (seen - civilUtc));
  if (civilClockUtcMillis(adjusted) === civilUtc) {
    return adjusted;
  }

  return null;
}

/**
 * Resolve a local civil time in Asia/Yerevan to a UTC instant.
 * The offset comes from Intl twice: once at the probe, then again at the
 * result, so a zone transition cannot leave the civil time on the wrong instant.
 */
export function instantFromCivilTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): Date {
  const civilUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond,
  );
  const firstPass = civilUtc - offsetMs(new Date(civilUtc));
  const secondPass = civilUtc - offsetMs(new Date(firstPass));
  const resolved =
    alignToCivilTime(secondPass, civilUtc) ??
    alignToCivilTime(firstPass, civilUtc);

  if (!resolved) {
    throw new Error(`Civil time does not exist in ${BUSINESS_TIMEZONE}`);
  }

  return resolved;
}

export function businessDateFromInstant(instant: Date): string {
  return formatBusinessTimestamp(instant).slice(0, 10);
}

export function startInstantOfBusinessDate(date: string): Date {
  const [year, month, day] = requireBusinessDate(date);
  return instantFromCivilTime(year, month, day, 0, 0, 0, 0);
}

export function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = requireBusinessDate(date);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return formatIsoDate(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

export function countInclusiveBusinessDays(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = requireBusinessDate(from);
  const [toYear, toMonth, toDay] = requireBusinessDate(to);
  const fromUtc = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toUtc = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((toUtc - fromUtc) / 86_400_000) + 1;
}

export function enumerateBusinessDates(from: string, to: string): string[] {
  if (from > to) {
    throw new Error("Business date range is reversed");
  }

  const count = countInclusiveBusinessDays(from, to);
  const dates: string[] = [];
  let cursor = from;
  for (let index = 0; index < count; index += 1) {
    dates.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return dates;
}

function mondayOffset(date: string): number {
  const [year, month, day] = requireBusinessDate(date);
  const noon = instantFromCivilTime(year, month, day, 12, 0, 0, 0);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    weekday: "short",
  }).format(noon);
  const offset = MONDAY_OFFSET[weekday];
  if (offset === undefined) {
    throw new Error(`Unexpected weekday: ${weekday}`);
  }
  return offset;
}

export function mondayWeekContaining(date: string): BusinessDateRange {
  const from = addCalendarDays(date, -mondayOffset(date));
  return { from, to: addCalendarDays(from, 6) };
}

export function calendarMonthContaining(date: string): BusinessDateRange {
  const [year, month] = requireBusinessDate(date);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: formatIsoDate(year, month, 1),
    to: formatIsoDate(year, month, lastDay),
  };
}

export function resolveOptionalBusinessDate(
  value: string | null,
  today: string,
): string | null {
  if (value === null) {
    return today;
  }
  if (!readBusinessDate(value)) {
    return null;
  }
  return value;
}

export function resolveInclusiveRange(
  from: string | null,
  to: string | null,
): BusinessDateRange | null {
  if (from === null || to === null) {
    return null;
  }
  if (!readBusinessDate(from) || !readBusinessDate(to)) {
    return null;
  }
  if (from > to) {
    return null;
  }
  if (countInclusiveBusinessDays(from, to) > MAX_INCLUSIVE_DAYS) {
    return null;
  }
  return { from, to };
}
