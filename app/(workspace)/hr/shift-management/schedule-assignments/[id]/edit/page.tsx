import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, UserCog } from "lucide-react";
import { ScheduleAssignmentForm } from "@/components/shifts/schedule-assignment-form";
import { frappeCall } from "@/lib/frappe/client";
import { listCompanies } from "@/lib/frappe/lookups";
import {
  getShiftScheduleAssignment,
  listShiftSchedules,
} from "@/lib/frappe/shift-schedules";
import { updateShiftScheduleAssignmentAction } from "../../../actions";

export const metadata = { title: "Edit schedule assignment · Colossal HR" };

async function listActiveEmployees(): Promise<
  Array<{ id: string; name: string }>
> {
  try {
    const rows = await frappeCall<
      Array<{ name: string; employee_name: string | null }>
    >({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["name", "employee_name"],
        filters: JSON.stringify([["status", "=", "Active"]]),
        order_by: "employee_name asc",
        limit_page_length: 500,
      },
      as: "user",
    });
    return rows.map((r) => ({ id: r.name, name: r.employee_name ?? r.name }));
  } catch {
    return [];
  }
}

export default async function EditScheduleAssignmentPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [sa, schedulesResult, employees, companies] = await Promise.all([
    getShiftScheduleAssignment(id),
    listShiftSchedules({ enabled: "Yes", pageSize: 100 }),
    listActiveEmployees(),
    listCompanies(),
  ]);
  if (!sa) notFound();
  const schedules = schedulesResult.rows.map((s) => s.id);

  const action = updateShiftScheduleAssignmentAction.bind(null, id);
  const backHref =
    `/hr/shift-management/schedule-assignments/${encodeURIComponent(id)}` as Route;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {sa.id}
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <UserCog className="h-3.5 w-3.5" />
          HR · Shift Management · Edit schedule assignment
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Edit {sa.id}
        </h1>
      </header>

      <ScheduleAssignmentForm
        mode="edit"
        action={action}
        schedules={schedules}
        employees={employees}
        companies={companies}
        cancelHref={backHref}
        initial={{
          shiftSchedule: sa.shiftSchedule,
          employee: sa.employee,
          startDate: sa.startDate,
          endDate: sa.endDate,
          status: sa.status,
          company: sa.company,
          notes: sa.notes,
        }}
      />
    </div>
  );
}
