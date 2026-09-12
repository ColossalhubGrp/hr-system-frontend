import "server-only";
import { frappeCall } from "./client";

export type AttendableEmployee = {
  id: string;
  employeeName: string;
  designation: string | null;
  department: string | null;
  branch: string | null;
  company: string | null;
  defaultShift: string | null;
  image: string | null;
};

/** Employees eligible to be marked in one bulk-attendance session.
 *  Filters by department / branch / company / shift; excludes Left. */
export async function listAttendableEmployees(opts: {
  department?: string;
  branch?: string;
  company?: string;
  shift?: string;
}): Promise<AttendableEmployee[]> {
  const filters: Array<[string, string, string]> = [
    ["status", "!=", "Left"],
  ];
  if (opts.department) filters.push(["department", "=", opts.department]);
  if (opts.branch) filters.push(["branch", "=", opts.branch]);
  if (opts.company) filters.push(["company", "=", opts.company]);
  if (opts.shift) filters.push(["default_shift", "=", opts.shift]);

  try {
    type Row = {
      name: string;
      employee_name: string | null;
      designation: string | null;
      department: string | null;
      branch: string | null;
      company: string | null;
      default_shift: string | null;
      image: string | null;
    };
    const rows = await frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: [
          "name",
          "employee_name",
          "designation",
          "department",
          "branch",
          "company",
          "default_shift",
          "image",
        ],
        filters: JSON.stringify(filters),
        order_by: "employee_name asc",
        limit_page_length: 500,
      },
      as: "user",
    });
    return rows.map((r) => ({
      id: r.name,
      employeeName: r.employee_name ?? r.name,
      designation: r.designation,
      department: r.department,
      branch: r.branch,
      company: r.company,
      defaultShift: r.default_shift,
      image: r.image,
    }));
  } catch {
    return [];
  }
}

/** All Branch names for the filter dropdown. */
export async function listBranches(): Promise<string[]> {
  try {
    const rows = await frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Branch",
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => r.name);
  } catch {
    return [];
  }
}

/** All Department names for the filter dropdown. */
export async function listDepartments(): Promise<string[]> {
  try {
    const rows = await frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Department",
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => r.name);
  } catch {
    return [];
  }
}

export type BulkMarkRow = {
  employee: string;
  date: string;
  status: string;
  shift?: string;
};

export type BulkMarkResult = {
  ok: boolean;
  created: Array<{ employee: string; date: string; name: string }>;
  skipped: Array<{ employee: string; date: string; reason: string }>;
  errored: Array<{ employee: string; date: string; reason: string }>;
  totals: { created: number; skipped: number; errored: number };
};

/** POST the bulk-mark payload to the HR-admin endpoint. Never raises —
 *  the endpoint returns per-row outcomes even when individual rows fail. */
export async function bulkMarkAttendance(input: {
  rows: BulkMarkRow[];
  skipHolidays: boolean;
  skipOnLeave: boolean;
}): Promise<BulkMarkResult> {
  return frappeCall<BulkMarkResult>({
    method: "recruitment_app.api.approvals.admin_bulk_mark_attendance",
    verb: "POST",
    args: {
      rows: JSON.stringify(input.rows),
      skip_holidays: input.skipHolidays ? 1 : 0,
      skip_on_leave: input.skipOnLeave ? 1 : 0,
    },
    as: "user",
  });
}
