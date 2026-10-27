import { connection } from "next/server";
import { resolveInclusiveRange } from "@/lib/stats/calendar";
import { statsJsonResponse } from "@/lib/stats/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  await connection();
  return statsJsonResponse(request, (_now, params) =>
    resolveInclusiveRange(params.get("from"), params.get("to")),
  );
}
