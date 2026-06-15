import "server-only";
import { frappeCall } from "./client";
import { readSession } from "./session";

/**
 * Self-service helpers for the signed-in employee. Every function resolves
 * the user → Employee record first (cached per request) and reads its OWN
 * scoped data. Frappe's row perms also enforce this server-side, so even if
 * a caller managed to pass another employee id, the underlying API would
 * still refuse.
 */

let cachedEmpId: { sid: string; id: string | null } | null = null;

async function myEmployeeId(): Promise<string | null> {
  const session = readSession();
  if (!session.sid || !session.userId) return null;
  if (cachedEmpId && cachedEmpId.sid === session.sid) return cachedEmpId.id;
  try {
    type Row = { name: string };
    const rows = await frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["name"],
        filters: JSON.stringify([["user_id", "=", session.userId]]),
        limit_page_length: 1,
      },
      as: "user",
    });
    const id = rows[0]?.name ?? null;
    cachedEmpId = { sid: session.sid, id };
    return id;
  } catch {
    cachedEmpId = { sid: session.sid, id: null };
    return null;
  }
}

// ============================================= Leave ========================

export type MyLeaveRow = {
  id: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  status: string;
  description: string | null;
};

export async function listMyLeaves(): Promise<MyLeaveRow[]> {
  const empId = await myEmployeeId();
  if (!empId) return [];
  try {
    type Raw = {
      name: string;
      leave_type: string;
      from_date: string;
      to_date: string;
      total_leave_days: number | null;
      status: string;
      description: string | null;
    };
    const rows = await frappeCall<Raw[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Leave Application",
        // Frappe v15 restricts list-view fields. The safe projectable set
        // for Leave Application: name, leave_type, from_date, to_date, status.
        // `total_leave_days` + `description` are not always projectable so
        // we omit them here and rely on get_count for balance tiles.
        fields: ["name", "leave_type", "from_date", "to_date", "status"],
        filters: JSON.stringify([["employee", "=", empId]]),
        order_by: "from_date desc",
        limit_page_length: 50,
      },
      as: "user",
    });
    return rows.map((r) => ({
      id: r.name,
      leaveType: r.leave_type,
      fromDate: r.from_date,
      toDate: r.to_date,
      totalDays: Number(r.total_leave_days ?? 0),
      status: r.status,
      description: r.description ?? null,
    }));
  } catch {
    return [];
  }
}

export type MyLeaveBalance = {
  leaveType: string;
  allocated: number;
  /** Whether the underlying Leave Allocation is submitted (and thus usable
   *  to apply against). Drafts won't accept Leave Applications. */
  usable: boolean;
};

/**
 * Sum the signed-in employee's Leave Allocations per leave type. We can't
 * use a native get_leave_balance method without HR User perms in some
 * configs, so this just rolls the raw allocation rows.
 */
export async function listMyLeaveBalances(): Promise<MyLeaveBalance[]> {
  const empId = await myEmployeeId();
  if (!empId) return [];
  try {
    type Raw = {
      name: string;
      leave_type: string;
      total_leaves_allocated: number | null;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<Raw[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Leave Allocation",
        fields: [
          "name",
          "leave_type",
          "total_leaves_allocated",
          "docstatus",
        ],
        filters: JSON.stringify([["employee", "=", empId]]),
        limit_page_length: 100,
      },
      as: "user",
    });
    const grouped = new Map<string, MyLeaveBalance>();
    for (const r of rows) {
      const existing = grouped.get(r.leave_type) ?? {
        leaveType: r.leave_type,
        allocated: 0,
        usable: false,
      };
      existing.allocated += Number(r.total_leaves_allocated ?? 0);
      if (r.docstatus === 1) existing.usable = true;
      grouped.set(r.leave_type, existing);
    }
    return Array.from(grouped.values()).sort((a, b) =>
      a.leaveType.localeCompare(b.leaveType),
    );
  } catch {
    return [];
  }
}

/** Names of every Leave Type — used to populate the apply-for-leave form. */
export async function listLeaveTypes(): Promise<string[]> {
  try {
    type Row = { name: string };
    const rows = await frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Leave Type",
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 50,
      },
      as: "user",
    });
    return rows.map((r) => r.name);
  } catch {
    return [];
  }
}

export type ApplyForLeaveInput = {
  leave_type: string;
  from_date: string;
  to_date: string;
  description?: string;
  half_day?: boolean;
};

export async function createMyLeaveApplication(
  input: ApplyForLeaveInput,
): Promise<string> {
  const empId = await myEmployeeId();
  if (!empId) {
    throw new Error("No Employee record linked to your user.");
  }
  const today = new Date();
  const postingDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const doc: Record<string, unknown> = {
    doctype: "Leave Application",
    employee: empId,
    leave_type: input.leave_type,
    from_date: input.from_date,
    to_date: input.to_date,
    posting_date: postingDate,
    status: "Open",
  };
  if (input.description) doc.description = input.description;
  if (input.half_day) doc.half_day = 1;
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

// ============================================= Payslips =====================

export type MyPayslipRow = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  netPay: number | null;
};

export async function listMyPayslips(): Promise<MyPayslipRow[]> {
  const empId = await myEmployeeId();
  if (!empId) return [];
  try {
    type Raw = {
      name: string;
      start_date: string;
      end_date: string;
      status: string;
      net_pay: number | null;
    };
    const rows = await frappeCall<Raw[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Salary Slip",
        fields: ["name", "start_date", "end_date", "status", "net_pay"],
        filters: JSON.stringify([["employee", "=", empId]]),
        order_by: "end_date desc",
        limit_page_length: 24,
      },
      as: "user",
    });
    return rows.map((r) => ({
      id: r.name,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
      netPay: r.net_pay !== null ? Number(r.net_pay) : null,
    }));
  } catch {
    return [];
  }
}

// ============================================= Goals ========================

export type MyGoalRow = {
  id: string;
  goalName: string;
  status: string;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  appraisalCycle: string | null;
};

export async function listMyGoals(): Promise<MyGoalRow[]> {
  const empId = await myEmployeeId();
  if (!empId) return [];
  try {
    type Raw = {
      name: string;
      goal: string | null;
      status: string;
      progress: number | null;
      start_date: string | null;
      end_date: string | null;
      appraisal_cycle: string | null;
    };
    const rows = await frappeCall<Raw[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Goal",
        // `goal` is the projectable label field in Frappe v15 — `goal_name`
        // is the form-side title but isn't always in_list_view.
        fields: [
          "name",
          "goal",
          "status",
          "progress",
          "start_date",
          "end_date",
          "appraisal_cycle",
        ],
        filters: JSON.stringify([["employee", "=", empId]]),
        order_by: "modified desc",
        limit_page_length: 50,
      },
      as: "user",
    });
    return rows.map((r) => ({
      id: r.name,
      goalName: r.goal ?? r.name,
      status: r.status,
      progress: Number(r.progress ?? 0),
      startDate: r.start_date,
      endDate: r.end_date,
      appraisalCycle: r.appraisal_cycle,
    }));
  } catch {
    return [];
  }
}
