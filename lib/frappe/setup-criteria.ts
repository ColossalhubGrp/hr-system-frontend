import "server-only";
import { frappeCall } from "./client";

/** Reusable Employee Feedback Criteria row — pure name for now
 *  (Frappe's doctype has only the criteria field + implicit metadata). */
export type FeedbackCriterion = {
  name: string;
  createdAt: string | null;
};

export async function listFeedbackCriteria(): Promise<FeedbackCriterion[]> {
  try {
    const rows = await frappeCall<Array<{ name: string; creation: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee Feedback Criteria",
        fields: ["name", "creation"],
        order_by: "name asc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      createdAt: r.creation ? r.creation.slice(0, 10) : null,
    }));
  } catch {
    return [];
  }
}

/** How many feedback rows reference each criterion — used to show
 *  a "used by N feedbacks" badge in the list. */
export async function countFeedbackCriteriaUsage(
  names: string[],
): Promise<Record<string, number>> {
  if (names.length === 0) return {};
  try {
    const rows = await frappeCall<Array<{ criteria: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee Feedback Rating",
        fields: ["criteria"],
        filters: JSON.stringify([["criteria", "in", names]]),
        limit_page_length: 0,
      },
      as: "user",
    });
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.criteria] = (counts[r.criteria] ?? 0) + 1;
    return counts;
  } catch {
    return {};
  }
}

export async function createFeedbackCriterion(name: string): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_create_feedback_criteria",
    verb: "POST",
    args: { criteria: name },
    as: "user",
  });
}

export async function deleteFeedbackCriterion(name: string): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_delete_feedback_criteria",
    verb: "POST",
    args: { criteria: name },
    as: "user",
  });
}
