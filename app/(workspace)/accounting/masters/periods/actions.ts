"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createAccountingPeriod,
  updateAccountingPeriod,
  deleteAccountingPeriod,
} from "@/lib/frappe/masters/accounting-period";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const schema = z.object({
  period_name: z.string().trim().min(1, "Name is required."),
  start_date: iso,
  end_date: iso,
  company: z.string().trim().min(1, "Company is required."),
});

function toFormState(err: unknown): FormState {
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (digest === "NEXT_NOT_FOUND") throw err;
  }
  if (err instanceof FrappeRequestError) return { error: err.message || `Backend error (${err.status}).` };
  return { error: err instanceof Error ? err.message : "Something went wrong." };
}

export async function createAccountingPeriodAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  let created: { name: string };
  try {
    created = await createAccountingPeriod({
      periodName: parsed.data.period_name,
      startDate: parsed.data.start_date,
      endDate: parsed.data.end_date,
      company: parsed.data.company,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/periods");
  redirect(`/accounting/masters/periods/${encodeURIComponent(created.name)}`);
}

export async function updateAccountingPeriodAction(
  name: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try {
    await updateAccountingPeriod(name, {
      periodName: parsed.data.period_name,
      startDate: parsed.data.start_date,
      endDate: parsed.data.end_date,
      company: parsed.data.company,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/periods");
  revalidatePath(`/accounting/masters/periods/${name}`);
  return {};
}

export async function deleteAccountingPeriodAction(name: string): Promise<FormState> {
  try {
    await deleteAccountingPeriod(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/periods");
  redirect("/accounting/masters/periods");
}
