"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { currentLink, focusRing, idleLink } from "@/components/office/focus";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "History" },
  { href: "/calendar", label: "Calendar" },
  { href: "/statistics", label: "Statistics" },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/history") {
    return pathname === "/history" || pathname.startsWith("/history/");
  }
  return pathname === href;
}

export function OfficeNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="flex flex-wrap gap-1">
      {LINKS.map((link) => {
        const current = isCurrent(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm",
              focusRing,
              current ? currentLink : idleLink,
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
