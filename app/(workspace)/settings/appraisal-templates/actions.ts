"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  deleteAppraisalTemplate,
  upsertAppraisalTemplate,
} from "@/lib/frappe/setup-appraisal-templates";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

async function requireHrAdmin(): Promise<StdFormState | null> {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    return { error: "Only HR admins can edit templates." };
  }
  return null;
}

const upsertSchema = z.object({
  name: z.string().trim().min(1, "Give the template a name."),
  description: z.string().trim().optional(),
});

/** Create OR update. `criteria_json` in FormData carries the child rows
 *  the client component serialized before submit — an array of
 *  {criteria, per_weightage} objects that must weight-sum to 100. */
export async function upsertAppraisalTemplateAction(
  _prev: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return blocked;

  const parsed = upsertSchema.safeParse({
    name: form.get("name"),
    description: form.get("description"),
  });
  if (!parsed.success) {
    const fieldErrors: StdFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key) fieldErrors[key] = issue.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors };
  }

  let rows: Array<{ criteria: string; per_weightage: number }>;
  try {
    const raw = String(form.get("criteria_json") ?? "[]");
    const parsedRows = JSON.parse(raw) as Array<{
      criteria: string;
      per_weightage: number;
    }>;
    rows = Array.isArray(parsedRows) ? parsedRows : [];
  } catch {
    return { error: "Rating criteria payload is corrupt." };
  }

  const cleaned = rows
    .map((r) => ({
      criteria: (r.criteria ?? "").trim(),
      per_weightage: Number(r.per_weightage) || 0,
    }))
    .filter((r) => r.criteria.length > 0);

  if (cleaned.length === 0) {
    return { error: "Add at least one rating criterion." };
  }
  const total = cleaned.reduce((acc, r) => acc + r.per_weightage, 0);
  if (Math.abs(total - 100) > 0.5) {
    return {
      error: `Rating criteria weightages must total 100 — currently ${total.toFixed(0)}%.`,
    };
  }

  let kraInputs: Array<{ key_result_area: string; per_weightage: number }>;
  try {
    const raw = String(form.get("kras_json") ?? "[]");
    const parsedKras = JSON.parse(raw) as Array<{
      key_result_area: string;
      per_weightage: number;
    }>;
    kraInputs = Array.isArray(parsedKras) ? parsedKras : [];
  } catch {
    return { error: "KRAs payload is corrupt." };
  }

  const cleanedKras = kraInputs
    .map((r) => ({
      key_result_area: (r.key_result_area ?? "").trim(),
      per_weightage: Number(r.per_weightage) || 0,
    }))
    .filter((r) => r.key_result_area.length > 0);

  if (cleanedKras.length === 0) {
    return { error: "Add at least one KRA." };
  }
  const kraTotal = cleanedKras.reduce((acc, r) => acc + r.per_weightage, 0);
  if (Math.abs(kraTotal - 100) > 0.5) {
    return {
      error: `KRA weightages must total 100 — currently ${kraTotal.toFixed(0)}%.`,
    };
  }

  try {
    await upsertAppraisalTemplate({
      name: parsed.data.name,
      description: parsed.data.description,
      ratingCriteria: cleaned,
      kras: cleanedKras,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/appraisal-templates");
  revalidatePath(
    `/settings/appraisal-templates/${encodeURIComponent(parsed.data.name)}`,
  );
  redirect("/settings/appraisal-templates");
}

export async function deleteAppraisalTemplateAction(
  _prev: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return blocked;
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Missing template name." };
  try {
    await deleteAppraisalTemplate(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/appraisal-templates");
  return {};
}
