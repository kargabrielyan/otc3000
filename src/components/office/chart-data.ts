import {
  businessTimeOfDayMs,
  formatBusinessDate,
  formatChartLabel,
  formatSummaryClock,
} from "@/lib/format";
import type { DayStats } from "@/lib/stats/types";

export type OfficeTimePoint = {
  date: string;
  label: string;
  fullDate: string;
  officeMs: number;
  future: boolean;
};

export type ArrivalPoint = {
  date: string;
  label: string;
  fullDate: string;
  arrivalMs: number;
  clock: string;
};

export function toOfficePoints(
  days: readonly DayStats[],
  today: string,
  density: "weekday" | "day",
): OfficeTimePoint[] {
  return days.map((day) => {
    const future = day.date > today;
    return {
      date: day.date,
      label: formatChartLabel(day.date, density),
      fullDate: formatBusinessDate(day.date),
      officeMs: future ? 0 : day.officeMs,
      future,
    };
  });
}

export function toArrivalPoints(
  days: readonly DayStats[],
  today: string,
  density: "weekday" | "day",
): ArrivalPoint[] {
  const points: ArrivalPoint[] = [];
  for (const day of days) {
    if (day.date > today || day.firstArrival === null) {
      continue;
    }
    const arrivalMs = businessTimeOfDayMs(day.firstArrival);
    if (arrivalMs === null) {
      continue;
    }
    points.push({
      date: day.date,
      label: formatChartLabel(day.date, density),
      fullDate: formatBusinessDate(day.date),
      arrivalMs,
      clock: formatSummaryClock(day.firstArrival),
    });
  }
  return points;
}
