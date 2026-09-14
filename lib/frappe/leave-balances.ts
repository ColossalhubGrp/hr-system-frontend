import "server-only";
import { frappeCall } from "./client";

export type LeaveBalanceCell = {
  allocated: number;
  used: number;
  remaining: number;
  /** 0..1 — fraction of allocated that's been used. `null` when allocated=0
   *  so callers can distinguish "over-utilised" (>1) from "not allocated". */
  utilisationPct: number | null;
};

export type LeaveBalanceRow = {
  employee: string;
  employeeName: string | null;
  department: string | null;
  branch: string | null;
  designation: string | null;
  /** Keyed by leave-type name. Only types with max_leaves_allowed > 0 and
   *  is_lwp = 0 are included. */
  balances: Record<string, LeaveBalanceCell>;
  /** Sum of remaining across every eligible type. This is the number HR
   *  cares about for company-wide leave liability. */
  totalRemaining: number;
};

export type LeaveBalancesResult = {
  /** Ordered leave-type names — same order used across every row so the
   *  UI can render as a wide table. */
  leaveTypes: string[];
  rows: LeaveBalanceRow[];
  /** Company-wide totals for the tile row at the top of the page. */
  totals: {
    employees: number;
    totalLiabilityDays: number;
    zeroUsedEmployees: number;
    perType: Record<string, { allocated: number; used: number; remaining: number }>;
  };
};

/** Snapshot every active employee's leave balance across every eligible
 *  leave type. Sums submitted Leave Allocations covering `asOf` and
 *  subtracts submitted Approved Leave Applications ending on or before
 *  the same date. Cheap enough for a few thousand employees — we hit
 *  Frappe three times total, then aggregate in JS. */
export async function listLeaveBalances(opts?: {
  asOf?: string;
  department?: string;
  employee?: string;
}): Promise<LeaveBalancesResult> {
  const asOf = opts?.asOf ?? new Date().toISOString().slice(0, 10);

  const employeeFilters: Array<[string, string, string]> = [
    ["status", "=", "Active"],
  ];
  if (opts?.department) employeeFilters.push(["department", "=", opts.department]);
  if (opts?.employee) employeeFilters.push(["name", "=", opts.employee]);

  type EmpRow = {
    name: string;
    employee_name: string | null;
    department: string | null;
    branch: string | null;
    designation: string | null;
  };
  type TypeRow = {
    name: string;
    max_leaves_allowed: number | null;
    is_lwp: 0 | 1 | null;
  };
  type AllocRow = {
    employee: string;
    leave_type: string;
    total_leaves_allocated: number | null;
  };
  type AppRow = {
    employee: string;
    leave_type: string;
    total_leave_days: number | null;
  };

  let employees: EmpRow[] = [];
  let leaveTypesRaw: TypeRow[] = [];
  let allocations: AllocRow[] = [];
  let applications: AppRow[] = [];

  try {
    [employees, leaveTypesRaw, allocations, applications] = await Promise.all([
      frappeCall<EmpRow[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Employee",
          fields: ["name", "employee_name", "department", "branch", "designation"],
          filters: JSON.stringify(employeeFilters),
          order_by: "employee_name asc",
          limit_page_length: 2000,
        },
        as: "user",
      }),
      frappeCall<TypeRow[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Leave Type",
          fields: ["name", "max_leaves_allowed", "is_lwp"],
          order_by: "name asc",
          limit_page_length: 100,
        },
        as: "user",
      }),
      frappeCall<AllocRow[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Leave Allocation",
          fields: ["employee", "leave_type", "total_leaves_allocated"],
          filters: JSON.stringify([
            ["docstatus", "=", 1],
            ["from_date", "<=", asOf],
            ["to_date", ">=", asOf],
          ]),
          limit_page_length: 5000,
        },
        as: "user",
      }),
      frappeCall<AppRow[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Leave Application",
          fields: ["employee", "leave_type", "total_leave_days"],
          filters: JSON.stringify([
            ["docstatus", "=", 1],
            ["status", "=", "Approved"],
            ["to_date", "<=", asOf],
          ]),
          limit_page_length: 20000,
        },
        as: "user",
      }),
    ]);
  } catch {
    // A partial fetch is fine — render whatever we've got with zero cells.
  }

  const eligibleTypes = leaveTypesRaw
    .filter((t) => !t.is_lwp && Number(t.max_leaves_allowed ?? 0) > 0)
    .map((t) => t.name);

  // Optional employee filter — restrict allocations/applications to the
  // same set of employees the top-of-page filter picked, so cells align
  // with the visible roster.
  const empIds = new Set(employees.map((e) => e.name));

  const key = (e: string, t: string) => `${e}::${t}`;
  const allocMap = new Map<string, number>();
  for (const a of allocations) {
    if (!empIds.has(a.employee)) continue;
    const k = key(a.employee, a.leave_type);
    allocMap.set(k, (allocMap.get(k) ?? 0) + Number(a.total_leaves_allocated ?? 0));
  }
  const usedMap = new Map<string, number>();
  for (const a of applications) {
    if (!empIds.has(a.employee)) continue;
    const k = key(a.employee, a.leave_type);
    usedMap.set(k, (usedMap.get(k) ?? 0) + Number(a.total_leave_days ?? 0));
  }

  const perType: Record<string, { allocated: number; used: number; remaining: number }> = {};
  for (const t of eligibleTypes) {
    perType[t] = { allocated: 0, used: 0, remaining: 0 };
  }

  const rows: LeaveBalanceRow[] = employees.map((e) => {
    const balances: Record<string, LeaveBalanceCell> = {};
    let totalRemaining = 0;
    for (const t of eligibleTypes) {
      const allocated = allocMap.get(key(e.name, t)) ?? 0;
      const used = usedMap.get(key(e.name, t)) ?? 0;
      const remaining = Math.round((allocated - used) * 100) / 100;
      const utilisationPct = allocated > 0 ? used / allocated : null;
      balances[t] = { allocated, used, remaining, utilisationPct };
      totalRemaining += remaining;
      perType[t].allocated += allocated;
      perType[t].used += used;
      perType[t].remaining += remaining;
    }
    return {
      employee: e.name,
      employeeName: e.employee_name,
      department: e.department,
      branch: e.branch,
      designation: e.designation,
      balances,
      totalRemaining: Math.round(totalRemaining * 100) / 100,
    };
  });

  const zeroUsedEmployees = rows.filter((r) =>
    eligibleTypes.every((t) => (r.balances[t]?.used ?? 0) === 0),
  ).length;

  return {
    leaveTypes: eligibleTypes,
    rows,
    totals: {
      employees: rows.length,
      totalLiabilityDays:
        Math.round(rows.reduce((a, r) => a + r.totalRemaining, 0) * 100) / 100,
      zeroUsedEmployees,
      perType,
    },
  };
}
