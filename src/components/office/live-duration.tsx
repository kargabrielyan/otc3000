"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

export function LiveDuration({
  baseMs,
  generatedAt,
  live,
}: {
  baseMs: number;
  generatedAt: string;
  live: boolean;
}) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!live) {
      return;
    }

    const origin = Date.parse(generatedAt);
    if (Number.isNaN(origin)) {
      return;
    }

    const tick = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      setNowMs(Date.now());
    };

    tick();
    const id = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [generatedAt, live]);

  const origin = Date.parse(generatedAt);
  const extra =
    live && nowMs !== null && !Number.isNaN(origin)
      ? Math.max(0, nowMs - origin)
      : 0;

  return (
    <span className="tabular-nums">{formatDuration(baseMs + extra)}</span>
  );
}
