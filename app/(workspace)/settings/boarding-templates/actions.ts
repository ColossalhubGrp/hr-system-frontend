"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  deleteBoardingTemplate,
  saveOnboardingTemplate,
  saveSeparationTemplate,
} from "@/lib/frappe/lifecycle-ext";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type FormState = StdFormState;
export type BoardingKind = "onboarding" | "separation";

const activitySchema = z.object({
  activity_name: z.string().trim().min(1),
  role: z.string().trim().optional(),
  user: z.string().trim().optional(),
  begin_on: z.coerce.number().nonnegative().optional(),
  duration: z.coerce.number().positive().optional(),
  task_weight: z.coerce.number().nonnegative().optional(),
  required_for_employee_creation: z.boolean().optional(),
});

const schema = z.object({
  name: z.string().trim().optional(),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  employee_grade: z.string().trim().optional(),
  company: z.string().trim().optional(),
  activities_json: z
    .string()
    .transform((v) => (v ? JSON.parse(v) : []))
    .pipe(z.array(activitySchema)),
});

async function requireHrAdmin(): Promise<string | null> {
  const a = await getMyAccess();
  if (!a.isHrAdmin && !a.isItAdmin) return "Only HR admins can manage templates.";
  return null;
}

export async function saveBoardingTemplateAction(
  kind: BoardingKind,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Check the activities table." };
  const save = kind === "onboarding" ? saveOnboardingTemplate : saveSeparationTemplate;
  let name: string;
  try {
    name = await save({
      name: parsed.data.name || undefined,
      department: parsed.data.department || undefined,
      designation: parsed.data.designation || undefined,
      employeeGrade: parsed.data.employee_grade || undefined,
      company: parsed.data.company || undefined,
      activities: parsed.data.activities_json,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/boarding-templates");
  redirect(`/settings/boarding-templates/${kind}/${encodeURIComponent(name)}`);
}

export async function deleteBoardingTemplateAction(
  kind: BoardingKind,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  const doctype =
    kind === "onboarding" ? "Employee Onboarding Template" : "Employee Separation Template";
  try {
    await deleteBoardingTemplate(doctype, name);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to delete." };
  }
  revalidatePath("/settings/boarding-templates");
  return { ok: true };
}
