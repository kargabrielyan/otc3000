import { connection } from "next/server";
import { businessDateFromInstant } from "@/lib/stats/calendar";
import { statsJsonResponse } from "@/lib/stats/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  await connection();
  return statsJsonResponse(request, (now) => {
    const today = businessDateFromInstant(now);
    return { from: today, to: today };
  });
}
