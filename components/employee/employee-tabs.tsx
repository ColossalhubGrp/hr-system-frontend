import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/cn";

export type EmployeeTabId =
  | "overview"
  | "joining"
  | "contact"
  | "attendance"
  | "approvers"
  | "salary"
  | "profile"
  | "exit";

export const EMPLOYEE_TABS: { id: EmployeeTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "joining", label: "Joining" },
  { id: "contact", label: "Contact Details" },
  { id: "attendance", label: "Attendance" },
  { id: "approvers", label: "Approvers" },
  { id: "salary", label: "Salary" },
  { id: "profile", label: "Profile" },
  { id: "exit", label: "Exit" },
];

export function EmployeeTabs({
  basePath,
  active,
}: {
  basePath: string;
  active: EmployeeTabId;
}) {
  return (
    <nav
      aria-label="Employee sections"
      className="card -mb-2 overflow-x-auto p-1.5"
    >
      <ul className="flex min-w-max items-center gap-1">
        {EMPLOYEE_TABS.map((t) => {
          const isActive = t.id === active;
          const href = (
            t.id === "overview" ? basePath : `${basePath}?tab=${t.id}`
          ) as Route;
          return (
            <li key={t.id}>
              <Link
                href={href}
                className={cn(
                  "inline-flex items-center rounded-chip px-3.5 py-1.5 text-sm font-medium transition",
                  "focus-ring",
                  isActive
                    ? "bg-ink-800 text-white shadow-sm"
                    : "text-ash-600 hover:bg-canvas",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function isEmployeeTab(v: unknown): v is EmployeeTabId {
  return (
    typeof v === "string" && EMPLOYEE_TABS.some((t) => t.id === v)
  );
}
