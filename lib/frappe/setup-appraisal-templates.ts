import "server-only";
import { frappeCall, FrappeRequestError } from "./client";

export type TemplateRatingRow = {
  criteria: string;
  perWeightage: number;
};

/** Goals side of the template — HRMS's Appraisal Template requires at least
 *  one KRA row with weightages that total 100. */
export type TemplateKraRow = {
  keyResultArea: string;
  perWeightage: number;
};

export type TemplateSummary = {
  name: string;
  description: string | null;
  criteriaCount: number;
  krasCount: number;
  usedByCycles: number;
};

export type TemplateFull = {
  name: string;
  description: string | null;
  ratingCriteria: TemplateRatingRow[];
  kras: TemplateKraRow[];
};

/** All templates with a criterion count + usage count. Sorted by name. */
export async function listAppraisalTemplates(): Promise<TemplateSummary[]> {
  try {
    type Row = {
      name: string;
      description: string | null;
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

    const names = templates.map((t) => t.name);

    // Child-table counts have to come off the parent doc — a direct
    // get_list on the child DocType (Employee Feedback Rating / Appraisal
    // Template Goal) needs a role perm HR admins don't hold, so it silently
    // returns []. Fanning out `frappe.client.get` per parent uses the
    // parent's read perm (which HR admin does have) and returns child
    // tables inline.
    type ChildRead = {
      rating_criteria?: unknown[] | null;
      goals?: unknown[] | null;
    };
    const [fulls, cycleRows] = await Promise.all([
      Promise.all(
        names.map((name) =>
          frappeCall<ChildRead>({
            method: "frappe.client.get",
            args: { doctype: "Appraisal Template", name },
            as: "user",
          }).catch(() => ({}) as ChildRead),
        ),
      ),
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
    const kraCount: Record<string, number> = {};
    fulls.forEach((doc, i) => {
      const name = names[i];
      critCount[name] = Array.isArray(doc.rating_criteria)
        ? doc.rating_criteria.length
        : 0;
      kraCount[name] = Array.isArray(doc.goals) ? doc.goals.length : 0;
    });
    const cycleCount: Record<string, number> = {};
    for (const r of cycleRows)
      cycleCount[r.appraisal_template] = (cycleCount[r.appraisal_template] ?? 0) + 1;

    return templates.map((t) => ({
      name: t.name,
      description: t.description,
      criteriaCount: critCount[t.name] ?? 0,
      krasCount: kraCount[t.name] ?? 0,
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
      goals?: Array<{
        key_result_area: string;
        per_weightage: number | string | null;
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
      kras: (doc.goals ?? []).map((r) => ({
        keyResultArea: r.key_result_area,
        perWeightage: Number(r.per_weightage ?? 0),
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
  kras: Array<{ key_result_area: string; per_weightage: number }>;
}): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_upsert_appraisal_template",
    verb: "POST",
    args: {
      name: input.name,
      description: input.description ?? "",
      rating_criteria: JSON.stringify(input.ratingCriteria),
      kras: JSON.stringify(input.kras),
    },
    as: "user",
  });
}

/** All KRA titles the tenant already has — feeds the "New KRA" datalist
 *  on the template editor so HR picks from what's already been defined
 *  instead of retyping (and auto-creates on save if it's genuinely new). */
export async function listKrasPool(): Promise<string[]> {
  try {
    const rows = await frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "KRA",
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => r.name);
  } catch {
    return [];
  }
}

export async function deleteAppraisalTemplate(name: string): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_delete_appraisal_template",
    verb: "POST",
    args: { name },
    as: "user",
  });
}
