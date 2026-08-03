import "server-only";
import { frappeCall } from "./client";

export type LifecycleActivity = {
  name: string;
  activityName: string;
  user: string | null;
  role: string | null;
  beginOn: number | null;
  duration: number | null;
  requiredForEmployeeCreation: boolean;
  description: string | null;
  completed: boolean;
  completedOn: string | null;
  completedBy: string | null;
  idx: number;
};

type RawActivity = {
  name: string;
  activity_name: string;
  user: string | null;
  role: string | null;
  begin_on: number | null;
  duration: number | null;
  required_for_employee_creation: boolean | 0 | 1;
  description: string | null;
  completed: boolean | 0 | 1;
  completed_on: string | null;
  completed_by: string | null;
  idx: number;
};

function normalize(r: RawActivity): LifecycleActivity {
  return {
    name: r.name,
    activityName: r.activity_name,
    user: r.user,
    role: r.role,
    beginOn: r.begin_on,
    duration: r.duration,
    requiredForEmployeeCreation: Boolean(r.required_for_employee_creation),
    description: r.description,
    completed: Boolean(r.completed),
    completedOn: r.completed_on,
    completedBy: r.completed_by,
    idx: r.idx,
  };
}

export async function listLifecycleActivities(
  parent: string,
  parenttype: "Employee Onboarding" | "Employee Separation",
): Promise<LifecycleActivity[]> {
  try {
    const rows = await frappeCall<RawActivity[]>({
      method:
        "human_resources.api.lifecycle_activities.list_activities",
      args: { parent, parenttype },
      as: "user",
    });
    return (rows ?? []).map(normalize);
  } catch (err) {
    console.error("[listLifecycleActivities] fetch failed:", err);
    return [];
  }
}

export type AddActivityInput = {
  activity_name: string;
  user?: string;
  role?: string;
  begin_on?: number;
  duration?: number;
  required_for_employee_creation?: 0 | 1;
  description?: string;
};

export async function addLifecycleActivity(
  parent: string,
  parenttype: "Employee Onboarding" | "Employee Separation",
  input: AddActivityInput,
): Promise<LifecycleActivity> {
  const row = await frappeCall<RawActivity>({
    method: "human_resources.api.lifecycle_activities.add_activity",
    verb: "POST",
    args: { parent, parenttype, ...input },
    as: "user",
  });
  return normalize(row);
}

export type UpdateActivityInput = Partial<AddActivityInput>;

export async function updateLifecycleActivity(
  parent: string,
  parenttype: "Employee Onboarding" | "Employee Separation",
  rowName: string,
  input: UpdateActivityInput,
): Promise<LifecycleActivity> {
  const row = await frappeCall<RawActivity>({
    method: "human_resources.api.lifecycle_activities.update_activity",
    verb: "POST",
    args: { parent, parenttype, row_name: rowName, ...input },
    as: "user",
  });
  return normalize(row);
}

export async function removeLifecycleActivity(
  parent: string,
  parenttype: "Employee Onboarding" | "Employee Separation",
  rowName: string,
): Promise<void> {
  await frappeCall({
    method: "human_resources.api.lifecycle_activities.remove_activity",
    verb: "POST",
    args: { parent, parenttype, row_name: rowName },
    as: "user",
  });
}

export type ToggleCompletedResult = {
  activity: LifecycleActivity;
  status: "Pending" | "In Process" | "Completed";
  completedCount: number;
  totalCount: number;
};

export type AssignmentUser = { email: string; fullName: string };

/** Enabled non-website users the activity form can assign an activity to.
 *  Falls back to empty (dropdown renders just current value + placeholder)
 *  if the tenant scopes User reads out. */
export async function listAssignmentUsers(): Promise<AssignmentUser[]> {
  try {
    const rows = await frappeCall<Array<{ name: string; full_name: string | null }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "User",
        fields: ["name", "full_name"],
        filters: JSON.stringify([
          ["enabled", "=", 1],
          ["user_type", "!=", "Website User"],
          ["name", "!=", "Guest"],
        ]),
        order_by: "full_name asc",
        limit_page_length: 500,
      },
      as: "user",
    });
    return (rows ?? []).map((r) => ({
      email: r.name,
      fullName: r.full_name ?? r.name,
    }));
  } catch (err) {
    console.error("[listAssignmentUsers] fetch failed:", err);
    return [];
  }
}

/** Enabled Frappe roles for the "…or by role" dropdown. Filters out
 *  Frappe's built-in placeholders that no real person carries. */
export async function listAssignmentRoles(): Promise<string[]> {
  try {
    const rows = await frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Role",
        fields: ["name"],
        filters: JSON.stringify([["disabled", "=", 0]]),
        order_by: "name asc",
        limit_page_length: 200,
      },
      as: "user",
    });
    const HIDDEN = new Set([
      "Guest",
      "All",
      "Administrator",
      "Desk User",
      "Website Manager",
    ]);
    return (rows ?? []).map((r) => r.name).filter((n) => !HIDDEN.has(n));
  } catch (err) {
    console.error("[listAssignmentRoles] fetch failed:", err);
    return [];
  }
}

export async function setLifecycleActivityCompleted(
  parent: string,
  parenttype: "Employee Onboarding" | "Employee Separation",
  rowName: string,
  completed: boolean,
): Promise<ToggleCompletedResult> {
  const res = await frappeCall<{
    activity: RawActivity;
    status: "Pending" | "In Process" | "Completed";
    completed_count: number;
    total_count: number;
  }>({
    method: "human_resources.api.lifecycle_activities.set_activity_completed",
    verb: "POST",
    args: {
      parent,
      parenttype,
      row_name: rowName,
      completed: completed ? 1 : 0,
    },
    as: "user",
  });
  return {
    activity: normalize(res.activity),
    status: res.status,
    completedCount: res.completed_count,
    totalCount: res.total_count,
  };
}
