"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSkillAssessment } from "@/lib/frappe/lifecycle-ext";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type FormState = StdFormState;

const schema = z.object({
  employee: z.string().trim().min(1, "Pick an employee."),
  skill: z.string().trim().min(1, "Pick a skill."),
  proficiency: z.coerce.number().min(0).max(5),
  assessment_date: z.string().trim().min(1, "Pick a date."),
  notes: z.string().trim().optional(),
});

async function requireHrAdmin(): Promise<string | null> {
  const a = await getMyAccess();
  if (!a.isHrAdmin && !a.isItAdmin) return "Only HR admins can log skill assessments.";
  return null;
}

export async function createSkillAssessmentAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? "");
      if (k && !fe[k]) fe[k] = i.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors: fe };
  }
  try {
    await createSkillAssessment({
      employee: parsed.data.employee,
      skill: parsed.data.skill,
      proficiency: parsed.data.proficiency,
      assessmentDate: parsed.data.assessment_date,
      notes: parsed.data.notes || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/hr/skill-assessments");
  redirect("/hr/skill-assessments");
}
