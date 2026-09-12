"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createTrainingResult,
  createTrainingFeedback,
  submitAdminDoc,
} from "@/lib/frappe/finance-training";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type FormState = StdFormState;

const resultsSchema = z.object({
  training_event: z.string().trim().min(1),
  employees_json: z.string().transform((v) => JSON.parse(v)),
});

async function requireHrAdmin(): Promise<string | null> {
  const a = await getMyAccess();
  if (!a.isHrAdmin && !a.isItAdmin) return "Only HR admins can grade training.";
  return null;
}

export async function saveTrainingResultAction(
  eventId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = resultsSchema.safeParse({
    training_event: eventId,
    employees_json: form.get("employees_json"),
  });
  if (!parsed.success) return { error: "Give at least one grade." };
  const rows = z
    .array(
      z.object({
        employee: z.string().trim().min(1),
        hours: z.coerce.number().nonnegative().optional(),
        grade: z.string().trim().optional(),
        comments: z.string().trim().optional(),
      }),
    )
    .safeParse(parsed.data.employees_json);
  if (!rows.success || rows.data.length === 0)
    return { error: "Enter grades for at least one attendee." };
  let id: string;
  try {
    id = await createTrainingResult({
      trainingEvent: eventId,
      employees: rows.data,
    });
    await submitAdminDoc("Training Result", id);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath(`/hr/training/${encodeURIComponent(eventId)}`);
  revalidatePath(`/hr/training/${encodeURIComponent(eventId)}/results`);
  redirect(`/hr/training/${encodeURIComponent(eventId)}`);
}

const feedbackSchema = z.object({
  employee: z.string().trim().min(1, "Pick an employee."),
  feedback: z.string().trim().min(1, "Add your feedback."),
  rating: z.coerce.number().min(0).max(5).optional(),
});

export async function submitTrainingFeedbackAction(
  eventId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = feedbackSchema.safeParse({
    employee: form.get("employee"),
    feedback: form.get("feedback"),
    rating: form.get("rating"),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? "");
      if (k && !fe[k]) fe[k] = i.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors: fe };
  }
  let id: string;
  try {
    id = await createTrainingFeedback({
      employee: parsed.data.employee,
      trainingEvent: eventId,
      feedback: parsed.data.feedback,
      rating: parsed.data.rating,
    });
    await submitAdminDoc("Training Feedback", id);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath(`/hr/training/${encodeURIComponent(eventId)}`);
  revalidatePath(`/hr/training/${encodeURIComponent(eventId)}/feedback`);
  redirect(`/hr/training/${encodeURIComponent(eventId)}/feedback`);
}
