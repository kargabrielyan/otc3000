const CONNECTION_STRING = /postgres(?:ql)?:\/\/\S+/gi;

export function logInternalError(error: unknown): void {
  const text =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(text.replace(CONNECTION_STRING, "postgresql://[redacted]"));
}

export function internalErrorResponse(): Response {
  return Response.json(
    { success: false, error: "internal_error" },
    {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
