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

export async function listLeaveTypes(): Promise<LeaveTypeRow[]> {
  // Leave Type is tenant-wide reference data (every filer sees the
  // same list). Frappe HR's Leave Type doctype doesn't ship DocPerm
  // entries for the app's custom HR roles (HR Director / HR User),
  // and a raw get_list under those roles silently returns [] rather
  // than erroring — that produced misleading empty-state UI over
  // rows that actually existed. Backend method uses
  // ignore_permissions with an HR-bundle role gate so the list is
  // consistent for every HR user without touching each tenant's
  // DocPerm config.
  //
  // Falls back to the raw client.get_list (service token) if the
  // whitelisted method isn't deployed yet — matters during the
  // window between shipping this change and the VPS pull; without
  // the fallback the empty-state UI stays with no clear signal
  // that the backend needs updating.
  try {
    const rows = await frappeCall<Raw[]>({
      method: "recruitment_app.api.me.list_leave_types_admin",
      as: "user",
    });
    return (rows ?? []).map(toRow);
  } catch {
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
    }).catch(() => [] as Raw[]);
    return rows.map(toRow);
  }
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
