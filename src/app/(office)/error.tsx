"use client";

import { Button } from "@/components/ui/button";

export default function OfficeError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div role="alert" className="max-w-md space-y-3 py-8">
      <h1 className="text-lg font-medium">The report could not be loaded.</h1>
      <Button type="button" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
