import Link from "next/link";
import { cn } from "@/lib/utils";
import { focusRing } from "@/components/office/focus";

export default function HistoryDateNotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-medium">That date is not a real day.</h1>
      <Link
        href="/history"
        className={cn("text-sm underline decoration-border underline-offset-4", focusRing)}
      >
        Back to history
      </Link>
    </div>
  );
}
