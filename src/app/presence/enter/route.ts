import { connection } from "next/server";
import { internalErrorResponse, logInternalError } from "@/lib/http";
import { recordPresence } from "@/lib/presence/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  await connection();

  try {
    const result = await recordPresence("ENTER");
    if (result.recorded) {
      return Response.json({
        success: true,
        event: "ENTER",
        recorded: true,
      });
    }

    return Response.json({
      success: true,
      event: "ENTER",
      recorded: false,
      reason: result.reason,
    });
  } catch (error: unknown) {
    logInternalError(error);
    return internalErrorResponse();
  }
}
