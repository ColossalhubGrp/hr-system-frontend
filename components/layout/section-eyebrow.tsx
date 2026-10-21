"use client";

import { usePathname } from "next/navigation";

/**
 * Section eyebrow shown in the Topbar: picks a short noun phrase from
 * the current URL so the top strip answers "which product am I in?"
 * at a glance (Accounting / Payroll / HR / …) instead of a static
 * workspace label.
 *
 * Matched longest-prefix-first so /recruitment/hr/dashboard reads
 * "Recruitment" rather than slipping into the "/hr" bucket.
 */
export function SectionEyebrow() {
  const pathname = usePathname();
  return (
    <div className="min-w-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {labelForPath(pathname)}
    </div>
  );
}

const RULES: Array<[string, string]> = [
  ["/recruitment", "Recruitment"],
  ["/analytics", "Analytics"],
  ["/accounting", "Accounting"],
  ["/payroll", "Payroll"],
  ["/employee/lifecycle", "Lifecycle"],
  ["/employee/organization", "Organization"],
  ["/employee", "Employee"],
  ["/hr/shift-management", "Shift management"],
  ["/hr/leaves", "Leaves"],
  ["/hr/attendance", "Attendance"],
  ["/hr/expense-claims", "Expense claims"],
  ["/hr/training", "Training"],
  ["/hr/performance", "Performance"],
  ["/hr", "HR"],
  ["/team", "My team"],
  ["/me", "My workspace"],
  ["/loans", "Loans"],
  ["/audit", "Audit"],
  ["/data-steward", "Data"],
  ["/platform", "Platform"],
  ["/settings", "Configuration"],
  ["/sales", "Sales"],
  ["/stock", "Stock"],
  ["/buying", "Buying"],
  ["/manufacturing", "Manufacturing"],
  ["/dashboard", "Overview"],
];

function labelForPath(path: string): string {
  for (const [prefix, label] of RULES) {
    if (path === prefix || path.startsWith(prefix + "/")) return label;
  }
  return "Workspace";
}
