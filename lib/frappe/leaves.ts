import "server-only";
import { FrappeRequestError, frappeCall } from "./client";

export type LeaveStatus = "Open" | "Approved" | "Rejected" | "Cancelled";

export type LeaveRow = {
  id: string;
  employee: string;
  employeeName: string | null;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  status: LeaveStatus | string;
  postingDate: string | null;
};

export type LeaveListResult = {
  rows: LeaveRow[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    leaveTypes: string[];
    statuses: LeaveStatus[];
  };
  counts: {
    open: number;
    approved: number;
    rejected: number;
    days: number;
  };
};

type ListArgs = {
  doctype: string;
  fields?: string[];
  filters?: string;
  order_by?: string;
  limit_start?: number;
  limit_page_length?: number;
};

const STATUSES: LeaveStatus[] = ["Open", "Approved", "Rejected", "Cancelled"];

export async function fetchLeaves(opts: {
  status?: string;
  leaveType?: string;
  employee?: string;
  /**
   * Restrict the result set to applications by these employee ids. Used by
   * Line-Manager views (`/team/leave`) — the manager is allowed to see all
   * leave for their direct + indirect reports and no one else.
   * If the array is empty, the query short-circuits and returns no rows.
   */
  employees?: string[];
  page?: number;
  pageSize?: number;
}): Promise<LeaveListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  // Empty team-scope means "I'm a manager with no reports" — render nothing
  // rather than fall through to "show me everyone".
  if (opts.employees && opts.employees.length === 0) {
    return {
      rows: [],
      total: 0,
      page,
      pageSize,
      facets: { leaveTypes: [], statuses: STATUSES },
      counts: { open: 0, approved: 0, rejected: 0, days: 0 },
    };
  }

  const filters: Array<[string, string, string | string[]]> = [];
  if (opts.status) filters.push(["status", "=", opts.status]);
  if (opts.leaveType) filters.push(["leave_type", "=", opts.leaveType]);
  if (opts.employee) filters.push(["employee", "=", opts.employee]);
  if (opts.employees && opts.employees.length > 0) {
    filters.push(["employee", "in", opts.employees]);
  }

  const args: ListArgs = {
    doctype: "Leave Application",
    fields: [
      "name",
      "employee",
      "employee_name",
      "leave_type",
      "from_date",
      "to_date",
      "total_leave_days",
      "status",
      "posting_date",
    ],
    filters: JSON.stringify(filters),
    order_by: "from_date desc",
    limit_start: (page - 1) * pageSize,
    limit_page_length: pageSize,
  };

  type Row = {
    name: string;
    employee: string;
    employee_name: string | null;
    leave_type: string;
    from_date: string;
    to_date: string;
    total_leave_days: number | null;
    status: string;
    posting_date: string | null;
  };

  const [rowsRaw, totalRaw, leaveTypesRaw, summary] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args,
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Leave Application",
        filters: JSON.stringify(filters),
      },
      as: "user",
    }).catch(() => 0),
    frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Leave Type",
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 100,
      },
      as: "user",
    }).catch(() => []),
    fetchLeaveCounts(opts.employee).catch(() => ({
      open: 0,
      approved: 0,
      rejected: 0,
      days: 0,
    })),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      leaveType: r.leave_type,
      fromDate: r.from_date,
      toDate: r.to_date,
      totalDays: Number(r.total_leave_days ?? 0),
      status: r.status as LeaveStatus,
      postingDate: r.posting_date,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
    facets: {
      leaveTypes: leaveTypesRaw.map((t) => t.name).filter(Boolean),
      statuses: STATUSES,
    },
    counts: summary,
  };
}

async function fetchLeaveCounts(employee?: string) {
  const base: Array<[string, string, string]> = [];
  if (employee) base.push(["employee", "=", employee]);

  const [openCount, approvedCount, rejectedCount, approvedRows] = await Promise.all([
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Leave Application",
        filters: JSON.stringify([...base, ["status", "=", "Open"]]),
      },
      as: "user",
    }),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Leave Application",
        filters: JSON.stringify([...base, ["status", "=", "Approved"]]),
      },
      as: "user",
    }),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Leave Application",
        filters: JSON.stringify([...base, ["status", "=", "Rejected"]]),
      },
      as: "user",
    }),
    frappeCall<Array<{ total_leave_days: number | null }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Leave Application",
        fields: ["total_leave_days"],
        filters: JSON.stringify([...base, ["status", "=", "Approved"]]),
        limit_page_length: 500,
      },
      as: "user",
    }),
  ]);

  const days = approvedRows.reduce(
    (acc, r) => acc + Number(r.total_leave_days ?? 0),
    0,
  );
  return {
    open: Number(openCount ?? 0),
    approved: Number(approvedCount ?? 0),
    rejected: Number(rejectedCount ?? 0),
    days,
  };
}

// --- single doc ------------------------------------------------------------

export type LeaveApplication = {
  id: string;
  docstatus: 0 | 1 | 2;
  employee: string;
  employeeName: string | null;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  halfDay: boolean;
  halfDayDate: string | null;
  status: LeaveStatus | string;
  postingDate: string | null;
  description: string | null;
  leaveApprover: string | null;
  leaveApproverName: string | null;
  department: string | null;
  company: string | null;
};

type RawLeaveDoc = {
  name: string;
  docstatus: 0 | 1 | 2;
  employee: string;
  employee_name: string | null;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_leave_days: number | null;
  half_day: 0 | 1 | boolean | null;
  half_day_date: string | null;
  status: string;
  posting_date: string | null;
  description: string | null;
  leave_approver: string | null;
  leave_approver_name: string | null;
  department: string | null;
  company: string | null;
};

export async function getLeaveApplication(
  id: string,
): Promise<LeaveApplication | null> {
  try {
    const doc = await frappeCall<RawLeaveDoc>({
      method: "frappe.client.get",
      args: { doctype: "Leave Application", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      docstatus: doc.docstatus,
      employee: doc.employee,
      employeeName: doc.employee_name,
      leaveType: doc.leave_type,
      fromDate: doc.from_date,
      toDate: doc.to_date,
      totalDays: Number(doc.total_leave_days ?? 0),
      halfDay: Boolean(doc.half_day),
      halfDayDate: doc.half_day_date,
      status: doc.status,
      postingDate: doc.posting_date,
      description: doc.description,
      leaveApprover: doc.leave_approver,
      leaveApproverName: doc.leave_approver_name,
      department: doc.department,
      company: doc.company,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

// --- writes ----------------------------------------------------------------

export type LeaveCreateInput = {
  employee: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  half_day?: boolean;
  half_day_date?: string;
  description?: string;
  leave_approver?: string;
};

export async function createLeaveApplication(
  input: LeaveCreateInput,
): Promise<string> {
  const doc: Record<string, unknown> = {
    doctype: "Leave Application",
    employee: input.employee,
    leave_type: input.leave_type,
    from_date: input.from_date,
    to_date: input.to_date,
    status: "Open",
  };
  if (input.half_day) {
    doc.half_day = 1;
    if (input.half_day_date) doc.half_day_date = input.half_day_date;
  }
  if (input.description) doc.description = input.description;
  if (input.leave_approver) doc.leave_approver = input.leave_approver;

  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

/**
 * Sets status to Approved/Rejected, then submits the doc. Frappe runs the
 * permission check (only the leave_approver or HR Manager can submit), so we
 * don't double-check here — the error bubbles up untouched.
 *
 * We load the full doc first so `frappe.client.submit` sees every field; the
 * leaner `{doctype, name}` shape isn't auto-hydrated on submit and fails on
 * required-field validation.
 */
export async function decideLeaveApplication(
  id: string,
  decision: "Approved" | "Rejected",
): Promise<void> {
  const fullDoc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Leave Application", name: id },
    as: "user",
  });
  fullDoc.status = decision;
  await frappeCall<unknown>({
    method: "frappe.client.submit",
    args: { doc: fullDoc },
    verb: "POST",
    as: "user",
  });
}
