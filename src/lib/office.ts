import { connection } from "next/server";
import { logInternalError } from "@/lib/http";
import { loadStatsReport } from "@/lib/stats/service";
import type { StatsReport } from "@/lib/stats/types";

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

export async function officeNow(): Promise<Date> {
  await connection();
  return new Date();
}

export async function loadOfficeReport(
  from: string,
  to: string,
  now: Date,
  weekdaysOnly = false,
): Promise<StatsReport> {
  try {
    return await loadStatsReport(from, to, now, weekdaysOnly);
  } catch (error: unknown) {
    logInternalError(error);
    throw new Error("The report could not be loaded.");
  }
}

export function firstQueryValue(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : null;
  }
  return null;
}

export function isMonthKey(value: string): boolean {
  return MONTH_KEY.test(value);
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const match = MONTH_KEY.exec(monthKey);
  if (!match) {
    return monthKey;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  const nextYear = String(shifted.getUTCFullYear()).padStart(4, "0");
  const nextMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}
