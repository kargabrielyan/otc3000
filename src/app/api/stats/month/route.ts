import { connection } from "next/server";
import {
  businessDateFromInstant,
  calendarMonthContaining,
  resolveOptionalBusinessDate,
} from "@/lib/stats/calendar";
import { statsJsonResponse } from "@/lib/stats/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  await connection();
  return statsJsonResponse(
    request,
    (now, params) => {
      const anchor = resolveOptionalBusinessDate(
        params.get("date"),
        businessDateFromInstant(now),
      );
      if (!anchor) {
        return null;
      }
      return calendarMonthContaining(anchor);
    },
    true,
  );
}
