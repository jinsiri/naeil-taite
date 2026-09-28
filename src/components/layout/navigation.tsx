"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  PanelsTopLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/resumes", label: "이력서", icon: FileText },
  { href: "/jobs", label: "채용공고", icon: BriefcaseBusiness },
  { href: "/applications", label: "지원 현황", icon: PanelsTopLeft },
];

export function Navigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주 메뉴"
      className="flex gap-1 overflow-x-auto p-3 lg:flex-col lg:p-0"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
