"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelExtDoc,
  createExitInterview,
  submitExtDoc,
} from "@/lib/frappe/lifecycle-ext";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type FormState = StdFormState;

const schema = z.object({
  employee: z.string().trim().min(1, "Pick an employee."),
  interview_date: z.string().trim().optional(),
  reason_for_leaving: z.string().trim().optional(),
  feedback: z.string().trim().optional(),
  employee_status: z.enum(["", "Employee Retained", "Exit Confirmed"]).optional(),
  interviewers_csv: z.string().trim().optional(),
});

async function requireHrAdmin(): Promise<string | null> {
  const a = await getMyAccess();
  if (!a.isHrAdmin && !a.isItAdmin) return "Only HR admins can manage exit interviews.";
  return null;
}

export async function createExitInterviewAction(
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
  const interviewers = (parsed.data.interviewers_csv ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let id: string;
  try {
    id = await createExitInterview({
      employee: parsed.data.employee,
      interviewDate: parsed.data.interview_date || undefined,
      reasonForLeaving: parsed.data.reason_for_leaving || undefined,
      feedback: parsed.data.feedback || undefined,
      employeeStatus: parsed.data.employee_status || undefined,
      interviewers,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/hr/exit-interviews");
  redirect(`/hr/exit-interviews/${encodeURIComponent(id)}`);
}

export async function submitExitInterviewAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await submitExtDoc("Exit Interview", id);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to submit." };
  }
  revalidatePath(`/hr/exit-interviews/${encodeURIComponent(id)}`);
  revalidatePath("/hr/exit-interviews");
  return { ok: true };
}

export async function cancelExitInterviewAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await cancelExtDoc("Exit Interview", id);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to cancel." };
  }
  revalidatePath(`/hr/exit-interviews/${encodeURIComponent(id)}`);
  revalidatePath("/hr/exit-interviews");
  return { ok: true };
}
