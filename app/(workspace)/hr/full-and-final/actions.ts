"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelExtDoc,
  createBlankFnf,
  createFnfFromSeparation,
  submitExtDoc,
} from "@/lib/frappe/lifecycle-ext";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type FormState = StdFormState;

const schema = z.object({
  employee: z.string().trim().min(1, "Pick an employee."),
  relieving_date: z.string().trim().min(1, "Pick the relieving date."),
  company: z.string().trim().optional(),
});

async function requireHrAdmin(): Promise<string | null> {
  const a = await getMyAccess();
  if (!a.isHrAdmin && !a.isItAdmin) return "Only HR admins can manage FnF statements.";
  return null;
}

export async function createFnfAction(
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
    id = await createBlankFnf({
      employee: parsed.data.employee,
      relievingDate: parsed.data.relieving_date,
      company: parsed.data.company || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/hr/full-and-final");
  redirect(`/hr/full-and-final/${encodeURIComponent(id)}`);
}

export async function createFnfFromSeparationAction(
  separation: string,
): Promise<{ ok: true; name: string; existing: boolean } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    const r = await createFnfFromSeparation(separation);
    revalidatePath("/hr/full-and-final");
    return { ok: true, name: r.name, existing: r.existing };
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to create FnF." };
  }
}

export async function submitFnfAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await submitExtDoc("Full and Final Statement", id);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to submit." };
  }
  revalidatePath(`/hr/full-and-final/${encodeURIComponent(id)}`);
  revalidatePath("/hr/full-and-final");
  return { ok: true };
}

export async function cancelFnfAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await cancelExtDoc("Full and Final Statement", id);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to cancel." };
  }
  revalidatePath(`/hr/full-and-final/${encodeURIComponent(id)}`);
  revalidatePath("/hr/full-and-final");
  return { ok: true };
}
