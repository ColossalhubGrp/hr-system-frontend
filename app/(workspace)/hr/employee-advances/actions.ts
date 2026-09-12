"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelAdminDoc,
  createEmployeeAdvance,
  submitAdminDoc,
} from "@/lib/frappe/finance-training";
import { formToRecord, toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type FormState = StdFormState;

const schema = z.object({
  employee: z.string().trim().min(1, "Pick an employee."),
  purpose: z.string().trim().min(1, "Say what the advance is for."),
  posting_date: z.string().trim().min(1, "Pick a date."),
  advance_amount: z.coerce.number().positive("Amount must be positive."),
  currency: z.string().trim().optional(),
  exchange_rate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
  mode_of_payment: z.string().trim().optional(),
  advance_account: z.string().trim().optional(),
});

async function requireHrAdmin(): Promise<string | null> {
  const a = await getMyAccess();
  if (!a.isHrAdmin && !a.isItAdmin) return "Only HR admins can manage advances.";
  return null;
}

function fieldErrors(parsed: z.SafeParseError<unknown>): FormState {
  const out: Record<string, string> = {};
  for (const i of parsed.error.issues) {
    const k = String(i.path[0] ?? "");
    if (k && !out[k]) out[k] = i.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

export async function createEmployeeAdvanceAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = schema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  let id: string;
  try {
    id = await createEmployeeAdvance({
      employee: parsed.data.employee,
      purpose: parsed.data.purpose,
      postingDate: parsed.data.posting_date,
      advanceAmount: parsed.data.advance_amount,
      currency: parsed.data.currency || undefined,
      exchangeRate: parsed.data.exchange_rate,
      modeOfPayment: parsed.data.mode_of_payment || undefined,
      advanceAccount: parsed.data.advance_account || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/hr/employee-advances");
  redirect(`/hr/employee-advances/${encodeURIComponent(id)}`);
}

export async function submitAdvanceAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await submitAdminDoc("Employee Advance", id);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to submit." };
  }
  revalidatePath(`/hr/employee-advances/${encodeURIComponent(id)}`);
  revalidatePath("/hr/employee-advances");
  return { ok: true };
}

export async function cancelAdvanceAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await cancelAdminDoc("Employee Advance", id);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to cancel." };
  }
  revalidatePath(`/hr/employee-advances/${encodeURIComponent(id)}`);
  revalidatePath("/hr/employee-advances");
  return { ok: true };
}
