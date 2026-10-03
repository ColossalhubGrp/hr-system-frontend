"use server";

import { frappeCall } from "@/lib/frappe/client";
import { requireGroup } from "@/lib/frappe/require-role";

/**
 * Fire-and-forget audit-log entry for a payroll audit-report export
 * (print or save-as-PDF). Called by the Print button right before
 * window.print(), so every externally-shared report is traceable to
 * who pulled it + for which date range.
 */
export async function logAuditReportExportAction(args: {
  from: string;
  to: string;
  runCount: number;
}): Promise<void> {
  await requireGroup("PAYROLL_ANY");
  try {
    await frappeCall({
      method: "frappe.client.insert",
      verb: "POST",
      as: "user",
      args: {
        doc: {
          doctype: "Activity Log",
          subject:
            `Exported payroll audit report for ${args.from} – ${args.to} ` +
            `(${args.runCount} pay run${args.runCount === 1 ? "" : "s"}).`,
          operation: "Exported",
          status: "Success",
          reference_doctype: "Payroll Run",
        },
      },
    });
  } catch {
    // Swallow — audit logging must never block the print.
  }
}
