import "server-only";
import { frappeCall, FrappeRequestError } from "./client";

export type TemplateRatingRow = {
  criteria: string;
  perWeightage: number;
};

export type TemplateSummary = {
  name: string;
  description: string | null;
  criteriaCount: number;
  usedByCycles: number;
};

export type TemplateFull = {
  name: string;
  description: string | null;
  ratingCriteria: TemplateRatingRow[];
};

/** All templates with a criterion count + usage count. Sorted by name. */
export async function listAppraisalTemplates(): Promise<TemplateSummary[]> {
  try {
    type Row = {
      name: string;
      description: string | null;
      rating_criteria?: Array<{ criteria: string | null }> | null;
    };
    const templates = await frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Appraisal Template",
        fields: ["name", "description"],
        order_by: "name asc",
        limit_page_length: 200,
      },
      as: "user",
    });

    // Frappe's list API doesn't include child tables — pull criteria
    // counts via a separate query against Employee Feedback Rating on
    // the parent. Same pattern for cycle usage counts.
    const names = templates.map((t) => t.name);
    const [criteriaRows, cycleRows] = await Promise.all([
      names.length
        ? frappeCall<Array<{ parent: string }>>({
            method: "frappe.client.get_list",
            args: {
              doctype: "Employee Feedback Rating",
              fields: ["parent"],
              filters: JSON.stringify([
                ["parenttype", "=", "Appraisal Template"],
                ["parent", "in", names],
              ]),
              limit_page_length: 0,
            },
            as: "user",
          }).catch(() => [])
        : [],
      names.length
        ? frappeCall<Array<{ appraisal_template: string }>>({
            method: "frappe.client.get_list",
            args: {
              doctype: "Appraisal Cycle",
              fields: ["appraisal_template"],
              filters: JSON.stringify([["appraisal_template", "in", names]]),
              limit_page_length: 0,
            },
            as: "user",
          }).catch(() => [])
        : [],
    ]);

    const critCount: Record<string, number> = {};
    for (const r of criteriaRows) critCount[r.parent] = (critCount[r.parent] ?? 0) + 1;
    const cycleCount: Record<string, number> = {};
    for (const r of cycleRows)
      cycleCount[r.appraisal_template] = (cycleCount[r.appraisal_template] ?? 0) + 1;

    return templates.map((t) => ({
      name: t.name,
      description: t.description,
      criteriaCount: critCount[t.name] ?? 0,
      usedByCycles: cycleCount[t.name] ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function getAppraisalTemplate(
  name: string,
): Promise<TemplateFull | null> {
  try {
    type Raw = {
      name: string;
      description: string | null;
      rating_criteria?: Array<{
        criteria: string;
        weightage_percent: number | string | null;
      }> | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Appraisal Template", name },
      as: "user",
    });
    return {
      name: doc.name,
      description: doc.description,
      ratingCriteria: (doc.rating_criteria ?? []).map((r) => ({
        criteria: r.criteria,
        perWeightage: Number(r.weightage_percent ?? 0),
      })),
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export async function upsertAppraisalTemplate(input: {
  name: string;
  description?: string;
  ratingCriteria: Array<{ criteria: string; per_weightage: number }>;
}): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_upsert_appraisal_template",
    verb: "POST",
    args: {
      name: input.name,
      description: input.description ?? "",
      rating_criteria: JSON.stringify(input.ratingCriteria),
    },
    as: "user",
  });
}

export async function deleteAppraisalTemplate(name: string): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_delete_appraisal_template",
    verb: "POST",
    args: { name },
    as: "user",
  });
}
