import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Layers } from "lucide-react";
import { BulkAssignForm } from "@/components/shifts/bulk-assign-form";
import { frappeCall } from "@/lib/frappe/client";
import { listCompanies, listShiftTypes } from "@/lib/frappe/lookups";
import { bulkAssignShiftAction } from "../../actions";

type ActiveWindow = { start: string; end: string | null };

/** Pull every Active Shift Assignment that could still overlap a future
 *  bulk assignment. The client uses these to greylist employees whose
 *  proposed range collides with a live assignment — mirrors Frappe HR's
 *  Shift Assignment Tool "auto-filters employees without overlapping
 *  active shifts" behaviour. */
async function fetchActiveShiftWindows(): Promise<Record<string, ActiveWindow[]>> {
  try {
    type Row = {
      employee: string;
      start_date: string;
      end_date: string | null;
    };
    const today = new Date().toISOString().slice(0, 10);
    const rows = await frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Shift Assignment",
        fields: ["employee", "start_date", "end_date"],
        filters: JSON.stringify([
          ["status", "=", "Active"],
          ["docstatus", "=", 1],
          // Open-ended (end_date null) OR ending on/after today.
          ["end_date", ">=", today],
        ]),
        or_filters: JSON.stringify([
          ["end_date", "is", "not set"],
          ["end_date", ">=", today],
        ]),
        order_by: "start_date asc",
        limit_page_length: 0,
      },
      as: "user",
    });
    const map: Record<string, ActiveWindow[]> = {};
    for (const r of rows) {
      (map[r.employee] ??= []).push({
        start: r.start_date,
        end: r.end_date,
      });
    }
    return map;
  } catch {
    return {};
  }
}

export const metadata = { title: "Bulk assign shifts · Colossal HR" };

type EmployeeOpt = {
  name: string;
  employee_name: string | null;
  department: string | null;
};

async function listActiveEmployees(): Promise<
  Array<{ id: string; name: string; department: string | null }>
> {
  try {
    const rows = await frappeCall<EmployeeOpt[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["name", "employee_name", "department"],
        filters: JSON.stringify([["status", "=", "Active"]]),
        order_by: "employee_name asc",
        limit_page_length: 500,
      },
      as: "user",
    });
    return rows.map((r) => ({
      id: r.name,
      name: r.employee_name ?? r.name,
      department: r.department,
    }));
  } catch {
    return [];
  }
}

export default async function BulkAssignPage() {
  const [employees, shiftTypes, companies, activeWindows] = await Promise.all([
    listActiveEmployees(),
    listShiftTypes(),
    listCompanies(),
    fetchActiveShiftWindows(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/shift-management?tab=assignments" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to assignments
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Layers className="h-3.5 w-3.5" />
          HR · Shift Management · Bulk assign
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Bulk assign a shift
        </h1>
        <p className="text-sm text-ash-600">
          Pick a shift type and a date range, then tick the employees you want
          on it. We'll file one Shift Assignment per employee.
        </p>
      </header>

      <BulkAssignForm
        action={bulkAssignShiftAction}
        employees={employees}
        shiftTypes={shiftTypes}
        companies={companies}
        activeWindows={activeWindows}
        cancelHref="/hr/shift-management?tab=assignments"
      />
    </div>
  );
}
