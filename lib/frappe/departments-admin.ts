import "server-only";
import { frappeCall } from "./client";

/**
 * Thin data layer for the /settings/departments admin page. Everything
 * runs through the `recruitment_app.api.departments_admin.*`
 * whitelisted methods, which enforce the admin gate + do the child-
 * table rewrite for approvers server-side. This module just types
 * the wire shape so the page + Server Action stay honest.
 */

export type ApproverEntry = {
  user_id: string | null;
  /** Employee name when the user_id resolves to an Employee row,
   *  else the User's full_name, else the raw user_id. */
  display: string | null;
};

export type DepartmentRow = {
  name: string;
  department_name: string;
  parent_department: string | null;
  company: string | null;
  is_group: boolean;
  disabled: boolean;
  payroll_cost_center: string | null;
  leave_block_list: string | null;
  leave_approver_count: number;
  expense_approver_count: number;
  shift_request_approver_count: number;
};

export type DepartmentDetail = {
  name: string;
  department_name: string;
  parent_department: string | null;
  company: string | null;
  is_group: boolean;
  disabled: boolean;
  payroll_cost_center: string | null;
  leave_block_list: string | null;
  leave_approvers: ApproverEntry[];
  expense_approvers: ApproverEntry[];
  shift_request_approver: ApproverEntry[];
};

export type ParentOption = {
  name: string;
  department_name: string;
  company: string | null;
  is_group: boolean;
};

export async function listDepartmentsAdmin(): Promise<DepartmentRow[]> {
  const rows = await frappeCall<DepartmentRow[]>({
    method: "recruitment_app.api.departments_admin.list_departments_admin",
    as: "user",
  });
  return rows ?? [];
}

export async function getDepartmentAdmin(
  name: string,
): Promise<DepartmentDetail> {
  return frappeCall<DepartmentDetail>({
    method: "recruitment_app.api.departments_admin.get_department_admin",
    args: { name },
    as: "user",
  });
}

export async function listParentDepartmentOptions(): Promise<ParentOption[]> {
  const rows = await frappeCall<ParentOption[]>({
    method: "recruitment_app.api.departments_admin.list_department_parent_options",
    as: "user",
  });
  return rows ?? [];
}

/** Shape the create + edit modal posts up. Approver arrays are
 *  User emails already — the frontend resolves employee ids to
 *  user emails before calling this, via
 *  lib/frappe/employee-approvers.resolveApproverUserId. */
export type DepartmentPayload = {
  department_name: string;
  company: string;
  parent_department?: string | null;
  is_group?: 0 | 1;
  disabled?: 0 | 1;
  payroll_cost_center?: string | null;
  leave_block_list?: string | null;
  leave_approvers: string[];
  expense_approvers: string[];
  shift_request_approver: string[];
};

export async function saveDepartmentAdmin(
  name: string | null,
  payload: DepartmentPayload,
): Promise<DepartmentDetail> {
  return frappeCall<DepartmentDetail>({
    method: "recruitment_app.api.departments_admin.save_department_admin",
    verb: "POST",
    args: {
      name: name ?? "",
      payload: JSON.stringify(payload),
    },
    as: "user",
  });
}

export async function deleteDepartmentAdmin(name: string): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.departments_admin.delete_department_admin",
    verb: "POST",
    args: { name },
    as: "user",
  });
}
