"use server";

import { revalidatePath } from "next/cache";
import {
  deleteDepartmentAdmin,
  getDepartmentAdmin,
  saveDepartmentAdmin,
  type DepartmentDetail,
  type DepartmentPayload,
} from "@/lib/frappe/departments-admin";
import {
  approverErrorMessage,
  resolveApproverUserId,
} from "@/lib/frappe/employee-approvers";
import { getMyAccess } from "@/lib/frappe/roles";
import { FrappeRequestError } from "@/lib/frappe/client";

export type LoadDepartmentResult =
  | { ok: true; row: DepartmentDetail }
  | { ok: false; error: string };

/** Client-callable wrapper for getDepartmentAdmin. The direct helper
 *  in `lib/frappe/departments-admin.ts` is marked "server-only" (it
 *  uses frappeCall which reads cookies via next/headers), so a
 *  client component can't import it — Vercel's build catches it
 *  even though local dev doesn't. Router it through a Server
 *  Action instead. */
export async function loadDepartmentAction(
  name: string,
): Promise<LoadDepartmentResult> {
  try {
    const row = await getDepartmentAdmin(name);
    return { ok: true, row };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

export type SaveDepartmentResult =
  | { ok: true; row: DepartmentDetail }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type DeleteDepartmentResult =
  | { ok: true }
  | { ok: false; error: string };

/** Input shape the client posts up. Approver arrays carry Employee
 *  ids (not user emails) because the picker deals in employees; we
 *  resolve each to a Frappe user_id before shipping to the backend
 *  so a picker option without a linked user gets provisioned lazily
 *  via the same helper other HR forms use. */
export type DepartmentClientInput = {
  department_name: string;
  company: string;
  parent_department?: string | null;
  is_group?: boolean;
  disabled?: boolean;
  payroll_cost_center?: string | null;
  leave_block_list?: string | null;
  leave_approvers: string[];
  expense_approvers: string[];
  shift_request_approver: string[];
};

async function resolveEmployeesToUsers(
  employeeIds: string[],
): Promise<{ ok: true; userIds: string[] } | { ok: false; failureLabel: string; reason: string }> {
  const userIds: string[] = [];
  for (const id of employeeIds) {
    // Empty rows can slip through the client; skip.
    if (!id.trim()) continue;
    // Already an email (verbatim option kept for backwards compat).
    if (id.includes("@")) {
      userIds.push(id.trim().toLowerCase());
      continue;
    }
    const res = await resolveApproverUserId(id);
    if (!res) continue;
    if (!res.ok) {
      return {
        ok: false,
        failureLabel: id,
        reason: approverErrorMessage(res.reason, "approver", res.detail),
      };
    }
    userIds.push(res.userId);
  }
  return { ok: true, userIds };
}

export async function saveDepartmentAction(
  name: string | null,
  input: DepartmentClientInput,
): Promise<SaveDepartmentResult> {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    return {
      ok: false,
      error: "Only HR Director / IT Admin can manage departments.",
    };
  }

  if (!input.department_name.trim()) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: { department_name: "Required." },
    };
  }
  if (!input.company.trim()) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: { company: "Required." },
    };
  }

  // Resolve each approver picker's value (an Employee id) into a
  // Frappe user_id. Any that can't be resolved (no email on record,
  // employee not found) bail early so the user sees a targeted
  // message instead of a mysterious server throw.
  const leave = await resolveEmployeesToUsers(input.leave_approvers);
  if (!leave.ok) {
    return {
      ok: false,
      error: `Leave approver "${leave.failureLabel}": ${leave.reason}`,
    };
  }
  const expense = await resolveEmployeesToUsers(input.expense_approvers);
  if (!expense.ok) {
    return {
      ok: false,
      error: `Expense approver "${expense.failureLabel}": ${expense.reason}`,
    };
  }
  const shift = await resolveEmployeesToUsers(input.shift_request_approver);
  if (!shift.ok) {
    return {
      ok: false,
      error: `Shift approver "${shift.failureLabel}": ${shift.reason}`,
    };
  }

  const payload: DepartmentPayload = {
    department_name: input.department_name.trim(),
    company: input.company.trim(),
    parent_department: input.parent_department || null,
    is_group: input.is_group ? 1 : 0,
    disabled: input.disabled ? 1 : 0,
    payroll_cost_center: input.payroll_cost_center || null,
    leave_block_list: input.leave_block_list || null,
    leave_approvers: leave.userIds,
    expense_approvers: expense.userIds,
    shift_request_approver: shift.userIds,
  };

  try {
    const row = await saveDepartmentAdmin(name, payload);
    revalidatePath("/settings/departments");
    return { ok: true, row };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

export async function deleteDepartmentAction(
  name: string,
): Promise<DeleteDepartmentResult> {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    return {
      ok: false,
      error: "Only HR Director / IT Admin can delete departments.",
    };
  }
  try {
    await deleteDepartmentAdmin(name);
    revalidatePath("/settings/departments");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

function friendlyError(err: unknown): string {
  if (err instanceof FrappeRequestError) {
    const detail = err.detail as
      | { _server_messages?: string; message?: string; exception?: string }
      | undefined;
    if (detail?._server_messages) {
      try {
        const arr = JSON.parse(detail._server_messages) as string[];
        const first = arr[0]
          ? (JSON.parse(arr[0]) as { message?: string })
          : undefined;
        if (first?.message) return stripHtml(first.message);
      } catch {
        /* fall through */
      }
    }
    if (typeof detail?.message === "string") return stripHtml(detail.message);
    if (typeof detail?.exception === "string") return stripHtml(detail.exception);
    return err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}
