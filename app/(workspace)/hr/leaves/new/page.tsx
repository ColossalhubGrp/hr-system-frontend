import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Plane } from "lucide-react";
import { frappeCall } from "@/lib/frappe/client";
import { LeaveForm } from "@/components/leaves/leave-form";
import { createLeaveAction } from "../actions";

export const metadata = { title: "New leave application · Colossal HR" };

async function listLeaveTypes(): Promise<string[]> {
  try {
    const rows = await frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Leave Type",
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 100,
      },
      as: "user",
    });
    return rows.map((r) => r.name).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function NewLeavePage({
  searchParams,
}: {
  searchParams: { employee?: string };
}) {
  const leaveTypes = await listLeaveTypes();
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={"/hr/leaves" as Route}
          className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to leaves
        </Link>
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Plane className="h-3.5 w-3.5" />
          HR · Leaves · New
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          File a leave application
        </h1>
        <p className="text-sm text-ash-600">
          The approver and the employee both get notified once you submit.
        </p>
      </header>

      <LeaveForm
        action={createLeaveAction}
        leaveTypes={leaveTypes}
        defaultEmployee={searchParams.employee}
      />
    </div>
  );
}
