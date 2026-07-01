"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const SETUP_TABS: { label: string; href: string }[] = [
  { label: "Banks", href: "/payroll/setup/banks" },
  { label: "Pay grades", href: "/payroll/setup/pay-grades" },
  { label: "Departments", href: "/payroll/setup/departments" },
  { label: "Pay points", href: "/payroll/setup/pay-points" },
  { label: "NEC / industry", href: "/payroll/setup/nec" },
  { label: "Earnings & deductions", href: "/payroll/setup/codes" },
  { label: "Settings", href: "/payroll/setup/settings" },
];

export function SetupTabs() {
  const pathname = usePathname();
  return (
    <div className="-mt-1 mb-5 border-b">
      <div className="flex gap-5 overflow-x-auto text-sm">
        {SETUP_TABS.map((t) => {
          const active = pathname === t.href || pathname?.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href as Route}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 pb-2 pt-1 font-semibold transition",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
