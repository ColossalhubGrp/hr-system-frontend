import "server-only";
import { frappeCall } from "./client";

/**
 * Client-facing shape for the Leave Type registry surfaced under
 * Settings → Leave Types. Only the knobs the tenant admin actually
 * cares about are exposed; obscure Frappe HR fields (block_leaves,
 * allow_negative, etc.) stay at the DocType defaults.
 */
export type LeaveTypeRow = {
  /** DocType `name` — also the label users see on the leave form. */
  name: string;
  /** How many days per year the type entitles an employee to. Fed
   *  into ensure_leave_allocation on the first application. */
  maxLeavesAllowed: number;
  /** Days that accrue over the year (annual/sick style) rather than
   *  a lump-sum allocation at the start. */
  isEarnedLeave: boolean;
  /** Unused days roll into the next year's allocation. */
  isCarryForward: boolean;
  /** Doesn't count towards paid leave — payroll deducts salary. */
  isLwp: boolean;
  /** When true, weekends / holidays within a leave window are
   *  counted as leave days (rare — most tenants leave this off). */
  includeHoliday: boolean;
  /** Waiting period in days after joining before the leave is
   *  usable. 0 = available immediately. */
  applicableAfter: number;
  /** Free-text notes for HR's own reference (not shown to filers). */
  description: string | null;
};

export type LeaveTypeInput = {
  name: string;
  maxLeavesAllowed: number;
  isEarnedLeave?: boolean;
  isCarryForward?: boolean;
  isLwp?: boolean;
  includeHoliday?: boolean;
  applicableAfter?: number;
  description?: string;
};

type Raw = {
  name: string;
  max_leaves_allowed: number | null;
  is_earned_leave: 0 | 1 | null;
  is_carry_forward: 0 | 1 | null;
  is_lwp: 0 | 1 | null;
  include_holiday: 0 | 1 | null;
  applicable_after: number | null;
  description: string | null;
};

function toRow(r: Raw): LeaveTypeRow {
  return {
    name: r.name,
    maxLeavesAllowed: Number(r.max_leaves_allowed ?? 0),
    isEarnedLeave: Boolean(r.is_earned_leave),
    isCarryForward: Boolean(r.is_carry_forward),
    isLwp: Boolean(r.is_lwp),
    includeHoliday: Boolean(r.include_holiday),
    applicableAfter: Number(r.applicable_after ?? 0),
    description: r.description,
  };
}

export type LeaveTypesReadResult = {
  rows: LeaveTypeRow[];
  /** Which path returned the rows — surfaces on the empty-state UI
   *  so we can tell "the backend method isn't deployed" from
   *  "the DB is genuinely empty" from "auth failed". */
  path: "admin_method" | "service_fallback" | "none";
  /** Populated when both paths failed / returned empty. */
  primaryError?: string;
  fallbackError?: string;
};

async function readAdmin(): Promise<Raw[]> {
  const rows = await frappeCall<Raw[]>({
    method: "recruitment_app.api.me.list_leave_types_admin",
    as: "user",
  });
  return rows ?? [];
}

async function readServiceFallback(): Promise<Raw[]> {
  const rows = await frappeCall<Raw[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Leave Type",
      fields: [
        "name",
        "max_leaves_allowed",
        "is_earned_leave",
        "is_carry_forward",
        "is_lwp",
        "include_holiday",
        "applicable_after",
        "description",
      ],
      order_by: "name asc",
      limit_page_length: 500,
    },
    as: "service",
  });
  return rows ?? [];
}

/** Deep read with diagnostic breadcrumbs. Page renders a debug hint
 *  in the empty state when `path === "none"` so we can distinguish
 *  "backend not deployed" / "auth failed" / "DB actually empty". */
export async function readLeaveTypes(): Promise<LeaveTypesReadResult> {
  let primaryError: string | undefined;
  try {
    const rows = await readAdmin();
    if (rows.length > 0) {
      return { rows: rows.map(toRow), path: "admin_method" };
    }
  } catch (err) {
    primaryError = err instanceof Error ? err.message : String(err);
  }

  let fallbackError: string | undefined;
  try {
    const rows = await readServiceFallback();
    if (rows.length > 0) {
      return {
        rows: rows.map(toRow),
        path: "service_fallback",
        primaryError,
      };
    }
  } catch (err) {
    fallbackError = err instanceof Error ? err.message : String(err);
  }

  return {
    rows: [],
    path: "none",
    primaryError,
    fallbackError,
  };
}

/** Preserved thin-wrapper for callers that just want the rows.
 *  The Settings page uses readLeaveTypes() directly for the meta. */
export async function listLeaveTypes(): Promise<LeaveTypeRow[]> {
  const { rows } = await readLeaveTypes();
  return rows;
}

export async function createLeaveType(input: LeaveTypeInput): Promise<string> {
  const doc = {
    doctype: "Leave Type",
    name: input.name,
    leave_type_name: input.name,
    max_leaves_allowed: input.maxLeavesAllowed,
    is_earned_leave: input.isEarnedLeave ? 1 : 0,
    is_carry_forward: input.isCarryForward ? 1 : 0,
    is_lwp: input.isLwp ? 1 : 0,
    include_holiday: input.includeHoliday ? 1 : 0,
    applicable_after: input.applicableAfter ?? 0,
    ...(input.description ? { description: input.description } : {}),
  };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return saved.name;
}

export async function updateLeaveType(
  originalName: string,
  input: LeaveTypeInput,
): Promise<string> {
  const finalName = input.name.trim();
  let currentName = originalName;
  // Leave Type autoname is `field:leave_type_name`, so renaming the
  // label is a rename_doc on the framework side.
  if (finalName && finalName !== originalName) {
    await frappeCall<unknown>({
      method: "frappe.client.rename_doc",
      verb: "POST",
      args: {
        doctype: "Leave Type",
        old_name: originalName,
        new_name: finalName,
        merge: 0,
      },
      as: "user",
    });
    currentName = finalName;
  }
  await frappeCall<unknown>({
    method: "frappe.client.set_value",
    verb: "POST",
    args: {
      doctype: "Leave Type",
      name: currentName,
      fieldname: {
        max_leaves_allowed: input.maxLeavesAllowed,
        is_earned_leave: input.isEarnedLeave ? 1 : 0,
        is_carry_forward: input.isCarryForward ? 1 : 0,
        is_lwp: input.isLwp ? 1 : 0,
        include_holiday: input.includeHoliday ? 1 : 0,
        applicable_after: input.applicableAfter ?? 0,
        description: input.description ?? "",
      },
    },
    as: "user",
  });
  return currentName;
}

export async function deleteLeaveType(name: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    verb: "POST",
    args: { doctype: "Leave Type", name },
    as: "user",
  });
}
