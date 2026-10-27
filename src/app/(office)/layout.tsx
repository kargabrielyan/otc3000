import { connection } from "next/server";
import { OfficeNav } from "@/components/office/nav";
import { RefreshOnVisible } from "@/components/office/refresh-on-visible";
import { focusRing } from "@/components/office/focus";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  return (
    <>
      <a
        href="#report"
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-10 focus:bg-background focus:px-3 focus:py-2",
          focusRing,
        )}
      >
        Skip to report
      </a>
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">OTC3000</p>
            <p className="text-xs text-muted-foreground">Asia/Yerevan</p>
          </div>
          <OfficeNav />
        </div>
      </header>
      <main
        id="report"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6"
      >
        {children}
      </main>
      <RefreshOnVisible />
    </>
  );
}
