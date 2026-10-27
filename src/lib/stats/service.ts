import { prisma } from "@/lib/db";
import { logInternalError, internalErrorResponse } from "@/lib/http";
import type { PresenceEventType } from "@/lib/presence/transitions";
import {
  addCalendarDays,
  startInstantOfBusinessDate,
} from "@/lib/stats/calendar";
import { buildStatsReport } from "@/lib/stats/engine";
import type { BusinessDateRange, StatsEvent, StatsReport } from "@/lib/stats/types";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const latestFirst = [{ createdAt: "desc" as const }, { id: "desc" as const }];
const chronological = [{ createdAt: "asc" as const }, { id: "asc" as const }];

const eventSelect = { id: true, type: true, createdAt: true } as const;

function toStatsEvent(row: {
  id: string;
  type: string;
  createdAt: Date;
}): StatsEvent {
  if (row.type !== "ENTER" && row.type !== "EXIT") {
    throw new Error("Unexpected presence event type");
  }

  const type: PresenceEventType = row.type;
  return { id: row.id, type, createdAt: row.createdAt };
}

export async function loadStatsReport(
  from: string,
  to: string,
  now: Date,
): Promise<StatsReport> {
  const rangeStart = startInstantOfBusinessDate(from);
  const rangeEnd = startInstantOfBusinessDate(addCalendarDays(to, 1));
  // While the selected dates contain `now`, [start, end) already includes
  // every event the report can see. A range that ends earlier still needs
  // the later rows: status is global, and an exit exactly on the exclusive
  // end closes the last day.
  const window =
    rangeEnd.getTime() > now.getTime()
      ? { gte: rangeStart, lt: rangeEnd, lte: now }
      : { gte: rangeStart, lte: now };

  const [prior, rows] = await Promise.all([
    prisma.presenceEvent.findFirst({
      where: { createdAt: { lt: rangeStart, lte: now } },
      orderBy: latestFirst,
      select: eventSelect,
    }),
    prisma.presenceEvent.findMany({
      where: { createdAt: window },
      orderBy: chronological,
      select: eventSelect,
    }),
  ]);

  const events = [
    ...(prior ? [toStatsEvent(prior)] : []),
    ...rows.map(toStatsEvent),
  ];
  return buildStatsReport({ events, from, to, now });
}

export async function statsJsonResponse(
  request: Request,
  selectRange: (
    now: Date,
    params: URLSearchParams,
  ) => BusinessDateRange | null,
): Promise<Response> {
  try {
    const now = new Date();
    const range = selectRange(now, new URL(request.url).searchParams);
    if (!range) {
      return Response.json(
        { success: false, error: "invalid_range" },
        { status: 400, headers: NO_STORE },
      );
    }

    const report = await loadStatsReport(range.from, range.to, now);
    return Response.json(report, { headers: NO_STORE });
  } catch (error: unknown) {
    logInternalError(error);
    return internalErrorResponse();
  }
}
