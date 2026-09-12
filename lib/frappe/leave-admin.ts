import "server-only";
import { frappeCall, FrappeRequestError } from "./client";

// ============================================================================
// Leave Period
// ============================================================================

export type LeavePeriodRow = {
  name: string;
  fromDate: string;
  toDate: string;
  company: string | null;
  isActive: boolean;
};

export async function listLeavePeriods(): Promise<LeavePeriodRow[]> {
  try {
    type R = {
      name: string;
      from_date: string;
      to_date: string;
      company: string | null;
      is_active: 0 | 1 | boolean | null;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Leave Period",
        fields: ["name", "from_date", "to_date", "company", "is_active"],
        order_by: "from_date desc",
        limit_page_length: 100,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      fromDate: r.from_date,
      toDate: r.to_date,
      company: r.company,
      isActive: Boolean(r.is_active),
    }));
  } catch {
    return [];
  }
}

export async function createLeavePeriod(input: {
  name: string;
  fromDate: string;
  toDate: string;
  company?: string;
  isActive?: boolean;
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Leave Period",
        name: input.name,
        leave_period_name: input.name,
        from_date: input.fromDate,
        to_date: input.toDate,
        ...(input.company ? { company: input.company } : {}),
        is_active: input.isActive ? 1 : 0,
      },
    },
    as: "user",
  });
  return saved.name;
}

export async function deleteLeavePeriod(name: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    verb: "POST",
    args: { doctype: "Leave Period", name },
    as: "user",
  });
}

// ============================================================================
// Leave Policy Assignment
// ============================================================================

export type LeavePolicyAssignmentRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  leavePolicy: string;
  assignmentBasedOn: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  leavesAllocated: boolean;
  docstatus: 0 | 1 | 2;
};

export async function listLeavePolicyAssignments(): Promise<
  LeavePolicyAssignmentRow[]
> {
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      leave_policy: string;
      assignment_based_on: string;
      effective_from: string | null;
      effective_to: string | null;
      leaves_allocated: 0 | 1 | boolean | null;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Leave Policy Assignment",
        fields: [
          "name",
          "employee",
          "employee_name",
          "leave_policy",
          "assignment_based_on",
          "effective_from",
          "effective_to",
          "leaves_allocated",
          "docstatus",
        ],
        order_by: "effective_from desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      leavePolicy: r.leave_policy,
      assignmentBasedOn: r.assignment_based_on,
      effectiveFrom: r.effective_from,
      effectiveTo: r.effective_to,
      leavesAllocated: Boolean(r.leaves_allocated),
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export async function createLeavePolicyAssignment(input: {
  employee: string;
  leavePolicy: string;
  assignmentBasedOn: "Leave Period" | "Joining Date" | "Manual";
  leavePeriod?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  carryForward?: boolean;
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Leave Policy Assignment",
        employee: input.employee,
        leave_policy: input.leavePolicy,
        assignment_based_on: input.assignmentBasedOn,
        ...(input.leavePeriod ? { leave_period: input.leavePeriod } : {}),
        ...(input.effectiveFrom ? { effective_from: input.effectiveFrom } : {}),
        ...(input.effectiveTo ? { effective_to: input.effectiveTo } : {}),
        carry_forward: input.carryForward ? 1 : 0,
      },
    },
    as: "user",
  });
  return saved.name;
}

// ============================================================================
// Leave Allocation
// ============================================================================

export type LeaveAllocationRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  leaveType: string;
  fromDate: string;
  toDate: string;
  newLeavesAllocated: number;
  unusedLeaves: number;
  totalLeavesAllocated: number;
  carryForward: boolean;
  docstatus: 0 | 1 | 2;
};

export async function listLeaveAllocations(opts?: {
  employee?: string;
  leaveType?: string;
}): Promise<LeaveAllocationRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.employee) filters.push(["employee", "=", opts.employee]);
  if (opts?.leaveType) filters.push(["leave_type", "=", opts.leaveType]);
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      leave_type: string;
      from_date: string;
      to_date: string;
      new_leaves_allocated: number | null;
      unused_leaves: number | null;
      total_leaves_allocated: number | null;
      carry_forward: 0 | 1 | boolean | null;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Leave Allocation",
        fields: [
          "name",
          "employee",
          "employee_name",
          "leave_type",
          "from_date",
          "to_date",
          "new_leaves_allocated",
          "unused_leaves",
          "total_leaves_allocated",
          "carry_forward",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "from_date desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      leaveType: r.leave_type,
      fromDate: r.from_date,
      toDate: r.to_date,
      newLeavesAllocated: Number(r.new_leaves_allocated ?? 0),
      unusedLeaves: Number(r.unused_leaves ?? 0),
      totalLeavesAllocated: Number(r.total_leaves_allocated ?? 0),
      carryForward: Boolean(r.carry_forward),
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export async function getLeaveAllocation(
  name: string,
): Promise<LeaveAllocationRow | null> {
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      leave_type: string;
      from_date: string;
      to_date: string;
      new_leaves_allocated: number | null;
      unused_leaves: number | null;
      total_leaves_allocated: number | null;
      carry_forward: 0 | 1 | boolean | null;
      docstatus: 0 | 1 | 2;
    };
    const doc = await frappeCall<R>({
      method: "frappe.client.get",
      args: { doctype: "Leave Allocation", name },
      as: "user",
    });
    return {
      name: doc.name,
      employee: doc.employee,
      employeeName: doc.employee_name,
      leaveType: doc.leave_type,
      fromDate: doc.from_date,
      toDate: doc.to_date,
      newLeavesAllocated: Number(doc.new_leaves_allocated ?? 0),
      unusedLeaves: Number(doc.unused_leaves ?? 0),
      totalLeavesAllocated: Number(doc.total_leaves_allocated ?? 0),
      carryForward: Boolean(doc.carry_forward),
      docstatus: doc.docstatus,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export async function createLeaveAllocation(input: {
  employee: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  newLeavesAllocated: number;
  carryForward?: boolean;
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Leave Allocation",
        employee: input.employee,
        leave_type: input.leaveType,
        from_date: input.fromDate,
        to_date: input.toDate,
        new_leaves_allocated: input.newLeavesAllocated,
        carry_forward: input.carryForward ? 1 : 0,
      },
    },
    as: "user",
  });
  return saved.name;
}

// ============================================================================
// Submit / Cancel / Adjust helpers (route through admin endpoints)
// ============================================================================

export async function submitLeaveDoc(
  doctype:
    | "Leave Allocation"
    | "Leave Policy Assignment"
    | "Leave Encashment"
    | "Compensatory Leave Request"
    | "Leave Block List",
  name: string,
): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_submit_generic",
    verb: "POST",
    args: { doctype, name },
    as: "user",
  });
}

export async function cancelLeaveDoc(
  doctype:
    | "Leave Allocation"
    | "Leave Policy Assignment"
    | "Leave Encashment"
    | "Compensatory Leave Request"
    | "Leave Block List",
  name: string,
): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_cancel_generic",
    verb: "POST",
    args: { doctype, name },
    as: "user",
  });
}

export async function adjustLeaveAllocation(input: {
  name: string;
  days: number;
  direction: "add" | "deduct";
  reason?: string;
}): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_adjust_leave_allocation",
    verb: "POST",
    args: {
      name: input.name,
      adjustment_days: input.days,
      direction: input.direction,
      ...(input.reason ? { reason: input.reason } : {}),
    },
    as: "user",
  });
}

// ============================================================================
// Leave Encashment
// ============================================================================

export type LeaveEncashmentRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  leaveType: string;
  encashmentDate: string;
  encashmentDays: number;
  encashmentAmount: number;
  docstatus: 0 | 1 | 2;
};

export async function listLeaveEncashments(): Promise<LeaveEncashmentRow[]> {
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      leave_type: string;
      encashment_date: string;
      encashment_days: number | null;
      encashment_amount: number | null;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Leave Encashment",
        fields: [
          "name",
          "employee",
          "employee_name",
          "leave_type",
          "encashment_date",
          "encashment_days",
          "encashment_amount",
          "docstatus",
        ],
        order_by: "encashment_date desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      leaveType: r.leave_type,
      encashmentDate: r.encashment_date,
      encashmentDays: Number(r.encashment_days ?? 0),
      encashmentAmount: Number(r.encashment_amount ?? 0),
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export async function createLeaveEncashment(input: {
  employee: string;
  leaveType: string;
  encashmentDate: string;
  payViaSalarySlip?: boolean;
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Leave Encashment",
        employee: input.employee,
        leave_type: input.leaveType,
        encashment_date: input.encashmentDate,
        pay_via_salary_slip: input.payViaSalarySlip === false ? 0 : 1,
      },
    },
    as: "user",
  });
  return saved.name;
}

// ============================================================================
// Compensatory Leave Request
// ============================================================================

export type CompLeaveRequestRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  leaveType: string;
  workFromDate: string;
  workEndDate: string;
  reason: string | null;
  docstatus: 0 | 1 | 2;
};

export async function listCompensatoryLeaveRequests(): Promise<
  CompLeaveRequestRow[]
> {
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      leave_type: string;
      work_from_date: string;
      work_end_date: string;
      reason: string | null;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Compensatory Leave Request",
        fields: [
          "name",
          "employee",
          "employee_name",
          "leave_type",
          "work_from_date",
          "work_end_date",
          "reason",
          "docstatus",
        ],
        order_by: "work_from_date desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      leaveType: r.leave_type,
      workFromDate: r.work_from_date,
      workEndDate: r.work_end_date,
      reason: r.reason,
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export async function createCompensatoryLeaveRequest(input: {
  employee: string;
  leaveType: string;
  workFromDate: string;
  workEndDate: string;
  reason?: string;
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Compensatory Leave Request",
        employee: input.employee,
        leave_type: input.leaveType,
        work_from_date: input.workFromDate,
        work_end_date: input.workEndDate,
        ...(input.reason ? { reason: input.reason } : {}),
      },
    },
    as: "user",
  });
  return saved.name;
}

// ============================================================================
// Leave Block List
// ============================================================================

export type LeaveBlockListRow = {
  name: string;
  company: string | null;
  appliesToAllDepartments: boolean;
  blocksCount: number;
};

export async function listLeaveBlockLists(): Promise<LeaveBlockListRow[]> {
  try {
    type R = {
      name: string;
      company: string | null;
      applies_to_all_departments: 0 | 1 | boolean | null;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Leave Block List",
        fields: ["name", "company", "applies_to_all_departments"],
        order_by: "name asc",
        limit_page_length: 100,
      },
      as: "user",
    });
    // Count child rows per parent via a second query.
    const names = rows.map((r) => r.name);
    const dateRows = names.length
      ? await frappeCall<Array<{ parent: string }>>({
          method: "frappe.client.get_list",
          args: {
            doctype: "Leave Block List Date",
            fields: ["parent"],
            filters: JSON.stringify([["parent", "in", names]]),
            limit_page_length: 0,
          },
          as: "user",
        }).catch(() => [])
      : [];
    const count: Record<string, number> = {};
    for (const d of dateRows) count[d.parent] = (count[d.parent] ?? 0) + 1;
    return rows.map((r) => ({
      name: r.name,
      company: r.company,
      appliesToAllDepartments: Boolean(r.applies_to_all_departments),
      blocksCount: count[r.name] ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function createLeaveBlockList(input: {
  name: string;
  company?: string;
  appliesToAllDepartments?: boolean;
  blocks: Array<{ block_date: string; reason: string }>;
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Leave Block List",
        leave_block_list_name: input.name,
        ...(input.company ? { company: input.company } : {}),
        applies_to_all_departments: input.appliesToAllDepartments ? 1 : 0,
        holidays: input.blocks.map((b) => ({
          doctype: "Leave Block List Date",
          block_date: b.block_date,
          reason: b.reason,
        })),
      },
    },
    as: "user",
  });
  return saved.name;
}

// ============================================================================
// Leave Ledger Entry
// ============================================================================

export type LeaveLedgerRow = {
  name: string;
  creation: string;
  employee: string;
  employeeName: string | null;
  leaveType: string;
  transactionType: string;
  transactionName: string;
  fromDate: string | null;
  toDate: string | null;
  leaves: number;
  isCarryForward: boolean;
  isExpired: boolean;
  company: string | null;
};

export async function listLeaveLedgerEntries(opts?: {
  employee?: string;
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<LeaveLedgerRow[]> {
  const filters: Array<[string, string, string | number]> = [];
  if (opts?.employee) filters.push(["employee", "=", opts.employee]);
  if (opts?.leaveType) filters.push(["leave_type", "=", opts.leaveType]);
  if (opts?.fromDate) filters.push(["from_date", ">=", opts.fromDate]);
  if (opts?.toDate) filters.push(["to_date", "<=", opts.toDate]);
  try {
    type R = {
      name: string;
      creation: string;
      employee: string;
      employee_name: string | null;
      leave_type: string;
      transaction_type: string;
      transaction_name: string;
      from_date: string | null;
      to_date: string | null;
      leaves: number | null;
      is_carry_forward: 0 | 1 | boolean | null;
      is_expired: 0 | 1 | boolean | null;
      company: string | null;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Leave Ledger Entry",
        fields: [
          "name",
          "creation",
          "employee",
          "employee_name",
          "leave_type",
          "transaction_type",
          "transaction_name",
          "from_date",
          "to_date",
          "leaves",
          "is_carry_forward",
          "is_expired",
          "company",
        ],
        filters: JSON.stringify(filters),
        order_by: "creation desc",
        limit_page_length: 500,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      creation: r.creation,
      employee: r.employee,
      employeeName: r.employee_name,
      leaveType: r.leave_type,
      transactionType: r.transaction_type,
      transactionName: r.transaction_name,
      fromDate: r.from_date,
      toDate: r.to_date,
      leaves: Number(r.leaves ?? 0),
      isCarryForward: Boolean(r.is_carry_forward),
      isExpired: Boolean(r.is_expired),
      company: r.company,
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// Bulk Holiday List assignment
// ============================================================================

export async function bulkAssignHolidayList(input: {
  holidayList: string;
  filters?: {
    department?: string;
    branch?: string;
    company?: string;
    employment_type?: string;
    grade?: string;
  };
  employees?: string[];
}): Promise<{ ok: boolean; updated: number; employees: string[] }> {
  return frappeCall<{ ok: boolean; updated: number; employees: string[] }>({
    method: "recruitment_app.api.approvals.admin_bulk_assign_holiday_list",
    verb: "POST",
    args: {
      holiday_list: input.holidayList,
      ...(input.filters ? { filters: JSON.stringify(input.filters) } : {}),
      ...(input.employees ? { employees: JSON.stringify(input.employees) } : {}),
    },
    as: "user",
  });
}
