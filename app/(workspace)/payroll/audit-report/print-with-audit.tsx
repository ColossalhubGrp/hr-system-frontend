"use client";

import { PrintButton } from "@/components/payroll/print-button";
import { logAuditReportExportAction } from "./actions";

/**
 * Thin wrapper around PrintButton that fires an Activity Log entry
 * right before window.print(). Used only by the audit-report page so
 * the server action import stays off every other PrintButton site.
 */
export function PrintWithAudit({
  from,
  to,
  runCount,
  label = "Print / Save PDF",
}: {
  from: string;
  to: string;
  runCount: number;
  label?: string;
}) {
  return (
    <PrintButton
      label={label}
      onBeforePrint={() =>
        logAuditReportExportAction({ from, to, runCount })
      }
    />
  );
}
