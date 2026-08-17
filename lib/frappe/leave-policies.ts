import "server-only";
import { frappeCall } from "./client";

/**
 * Leave Policy = a named bundle of leave-type + annual-days rows.
 * "Standard Employee = Annual 15 + Sick 10 + Bereavement 3".
 * Assigned to employees via the bulk-allocate flow, which iterates
 * the policy's details and creates a Leave Allocation for each
 * (employee, leave_type) pair.
 */
export type LeavePolicyDetail = {
  leaveType: string;
  annualAllocation: number;
};

export type LeavePolicyRow = {
  /** DocType `name` — user-supplied. Also the label. */
  name: string;
  title: string;
  details: LeavePolicyDetail[];
  /** Sum of annual_allocation across all details. Handy for the
   *  list-table's "total days" column. */
  totalDays: number;
};

export type LeavePolicyInput = {
  title: string;
  details: LeavePolicyDetail[];
};

type RawParent = {
  name: string;
  title: string;
};

type RawDetail = {
  parent: string;
  leave_type: string;
  annual_allocation: number | null;
  idx: number;
};

export async function listLeavePolicies(): Promise<LeavePolicyRow[]> {
  // Backend method uses ignore_permissions with an HR-bundle role
  // gate so the list is consistent for every HR user — matches the
  // pattern used for Leave Types. See lib/frappe/leave-types.ts
  // for full rationale (including the fallback shape).
  let parents: RawParent[] = [];
  let details: RawDetail[] = [];
  try {
    const bundle = await frappeCall<{
      parents: RawParent[];
      details: RawDetail[];
    }>({
      method: "recruitment_app.api.me.list_leave_policies_admin",
      as: "user",
    });
    parents = bundle?.parents ?? [];
    details = bundle?.details ?? [];
  } catch {
    // Backend method not yet deployed — fall back to raw reads via
    // the service token so the page still renders whatever the
    // tenant has (may be an empty list on tenants whose service
    // user lacks perms; the admin method is the eventual fix).
    [parents, details] = await Promise.all([
      frappeCall<RawParent[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Leave Policy",
          fields: ["name", "title"],
          order_by: "title asc",
          limit_page_length: 200,
        },
        as: "service",
      }).catch(() => [] as RawParent[]),
      frappeCall<RawDetail[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Leave Policy Detail",
          fields: ["parent", "leave_type", "annual_allocation", "idx"],
          order_by: "parent asc, idx asc",
          limit_page_length: 2000,
        },
        as: "service",
      }).catch(() => [] as RawDetail[]),
    ]);
  }

  const detailsByParent = new Map<string, LeavePolicyDetail[]>();
  for (const d of details) {
    if (!detailsByParent.has(d.parent)) detailsByParent.set(d.parent, []);
    detailsByParent.get(d.parent)!.push({
      leaveType: d.leave_type,
      annualAllocation: Number(d.annual_allocation ?? 0),
    });
  }
  return parents.map((p) => {
    const dd = detailsByParent.get(p.name) ?? [];
    return {
      name: p.name,
      title: p.title || p.name,
      details: dd,
      totalDays: dd.reduce((sum, r) => sum + r.annualAllocation, 0),
    };
  });
}

export async function createLeavePolicy(
  input: LeavePolicyInput,
): Promise<string> {
  const doc = {
    doctype: "Leave Policy",
    title: input.title,
    leave_policy_details: input.details.map((d) => ({
      doctype: "Leave Policy Detail",
      leave_type: d.leaveType,
      annual_allocation: d.annualAllocation,
    })),
  };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return saved.name;
}

export async function updateLeavePolicy(
  policyName: string,
  input: LeavePolicyInput,
): Promise<void> {
  // Fetch the full doc, replace fields + child table, save. Child
  // tables can't be patched via set_value — Frappe expects the
  // whole doc for `save`. get + mutate + save is the safe path.
  const doc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Leave Policy", name: policyName },
    as: "user",
  });
  doc.title = input.title;
  doc.leave_policy_details = input.details.map((d) => ({
    doctype: "Leave Policy Detail",
    leave_type: d.leaveType,
    annual_allocation: d.annualAllocation,
  }));
  await frappeCall<unknown>({
    method: "frappe.client.save",
    verb: "POST",
    args: { doc },
    as: "user",
  });
}

export async function deleteLeavePolicy(name: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    verb: "POST",
    args: { doctype: "Leave Policy", name },
    as: "user",
  });
}

/** Kick off a bulk allocation from an existing policy — creates /
 *  updates Leave Allocation rows for every active employee (with
 *  optional company + department filters) so the year starts with
 *  everyone's balance pre-filled instead of relying on per-request
 *  auto-provision. Uses the recruitment_app backend method. */
export async function bulkAllocateFromPolicy(input: {
  policy: string;
  fromDate: string;
  toDate: string;
  company?: string;
  department?: string;
}): Promise<{
  employees: number;
  policy_details: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: Array<{ employee: string; leave_type: string; error: string }>;
}> {
  return frappeCall({
    method: "recruitment_app.api.me.bulk_allocate_from_policy",
    verb: "POST",
    args: {
      policy: input.policy,
      from_date: input.fromDate,
      to_date: input.toDate,
      company: input.company,
      department: input.department,
    },
    as: "user",
  });
}
