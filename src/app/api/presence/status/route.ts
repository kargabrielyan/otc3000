import { connection } from "next/server";
import { internalErrorResponse, logInternalError } from "@/lib/http";
import { readPresenceStatus } from "@/lib/presence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await connection();

  try {
    const snapshot = await readPresenceStatus();
    return Response.json(
      { status: snapshot.status, since: snapshot.since },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    logInternalError(error);
    return internalErrorResponse();
  }
}
