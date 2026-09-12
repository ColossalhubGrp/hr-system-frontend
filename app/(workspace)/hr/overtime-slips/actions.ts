"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelExtDoc,
  createOvertimeSlip,
  fetchOvertimeDetails,
  submitExtDoc,
} from "@/lib/frappe/lifecycle-ext";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type FormState = StdFormState;

const schema = z
  .object({
    employee: z.string().trim().min(1, "Pick an employee."),
    from_date: z.string().trim().min(1, "Pick a start date."),
    to_date: z.string().trim().min(1, "Pick an end date."),
    company: z.string().trim().optional(),
  })
  .refine((d) => d.to_date >= d.from_date, {
    message: "End must be on/after start.",
    path: ["to_date"],
  });

async function requireHrAdmin(): Promise<string | null> {
  const a = await getMyAccess();
  if (!a.isHrAdmin && !a.isItAdmin) return "Only HR admins can manage overtime slips.";
  return null;
}

export async function createOvertimeSlipAction(
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
  let id: string;
  try {
    id = await createOvertimeSlip({
      employee: parsed.data.employee,
      fromDate: parsed.data.from_date,
      toDate: parsed.data.to_date,
      company: parsed.data.company || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/hr/overtime-slips");
  redirect(`/hr/overtime-slips/${encodeURIComponent(id)}`);
}

export async function fetchOvertimeDetailsAction(
  id: string,
): Promise<{ ok: true; rows: number } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    const r = await fetchOvertimeDetails(id);
    revalidatePath(`/hr/overtime-slips/${encodeURIComponent(id)}`);
    return { ok: true, rows: r.rows };
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to fetch." };
  }
}

export async function submitOvertimeSlipAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await submitExtDoc("Overtime Slip", id);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to submit." };
  }
  revalidatePath(`/hr/overtime-slips/${encodeURIComponent(id)}`);
  revalidatePath("/hr/overtime-slips");
  return { ok: true };
}

export async function cancelOvertimeSlipAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await cancelExtDoc("Overtime Slip", id);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to cancel." };
  }
  revalidatePath(`/hr/overtime-slips/${encodeURIComponent(id)}`);
  revalidatePath("/hr/overtime-slips");
  return { ok: true };
}
