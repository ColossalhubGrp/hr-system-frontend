import "server-only";
import { frappeCall } from "./client";

/**
 * Self-service helpers for the signed-in employee. Every read goes
 * through recruitment_app.api.self_service — whitelisted methods that
 * resolve the caller's OWN Employee from the session and read only that
 * employee's data with elevated privileges. This means self-service
 * works for a plain Employee-role user who has no read permission on
 * the HR doctypes, and behaves the same on every tenant regardless of
 * its row-permission setup. The employee is never taken from a
 * parameter, so there's no way to reach anyone else's data.
 */

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
      method: "recruitment_app.api.self_service.my_leaves",
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
  try {
    type Raw = { leave_type: string; allocated: number; usable: boolean };
    const rows = await frappeCall<Raw[]>({
      method: "recruitment_app.api.self_service.my_leave_balances",
      as: "user",
    });
    return rows.map((r) => ({
      leaveType: r.leave_type,
      allocated: Number(r.allocated ?? 0),
      usable: Boolean(r.usable),
    }));
  } catch {
    return [];
  }
}

/** Names of every Leave Type — used to populate the apply-for-leave form. */
export async function listLeaveTypes(): Promise<string[]> {
  try {
    const rows = await frappeCall<string[]>({
      method: "recruitment_app.api.self_service.my_leave_types",
      as: "user",
    });
    return rows ?? [];
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
  const saved = await frappeCall<{ name: string }>({
    method: "recruitment_app.api.self_service.apply_leave",
    args: {
      leave_type: input.leave_type,
      from_date: input.from_date,
      to_date: input.to_date,
      description: input.description ?? "",
      half_day: input.half_day ? 1 : 0,
    },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

// ============================================= Payslips =====================

export type MyPayslipRow = {
  id: string;
  /** URL suffix for the per-slip view — /payroll/<run>/payslip/<empId> */
  payrollRun: string;
  /** Human label — e.g. "August 2026". Falls back to the run ID. */
  periodLabel: string;
  payDate: string | null;
  netUsd: number;
  netZig: number;
};

/**
 * Payslip history for the signed-in employee. This tenant runs
 * payroll via the custom Belina flow — Payroll Run Payslip, not
 * stock ERPNext Salary Slip — so we hit that doctype and lift the
 * period label + pay date from the parent Payroll Run.
 */
export async function listMyPayslips(): Promise<MyPayslipRow[]> {
  try {
    type Raw = {
      id: string;
      payroll_run: string;
      period_label: string;
      pay_date: string | null;
      net_usd: number | null;
      net_zig: number | null;
    };
    const slips = await frappeCall<Raw[]>({
      method: "recruitment_app.api.self_service.my_payslips",
      as: "user",
    });
    return slips.map((s) => ({
      id: s.id,
      payrollRun: s.payroll_run,
      periodLabel: s.period_label ?? s.payroll_run,
      payDate: s.pay_date ?? null,
      netUsd: Number(s.net_usd ?? 0),
      netZig: Number(s.net_zig ?? 0),
    }));
  } catch (err) {
    console.error("[listMyPayslips] fetch failed:", err);
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
      method: "recruitment_app.api.self_service.my_goals",
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
