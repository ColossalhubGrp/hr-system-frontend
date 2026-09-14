"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createPayableAccount,
  deletePayableAccount,
} from "@/lib/frappe/payable-accounts";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type FormState = StdFormState & { created?: string };

const schema = z.object({
  company: z.string().trim().min(1, "Pick a company."),
  account_name: z.string().trim().min(1, "Account name is required."),
  account_number: z.string().trim().optional(),
});

async function requireHrAdmin(): Promise<string | null> {
  const a = await getMyAccess();
  if (!a.isHrAdmin && !a.isItAdmin)
    return "Only HR admins can manage payable accounts.";
  return null;
}

export async function createPayableAccountAction(
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
  let name: string;
  try {
    name = await createPayableAccount({
      company: parsed.data.company,
      accountName: parsed.data.account_name,
      accountNumber: parsed.data.account_number || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/payable-accounts");
  return { created: name };
}

export async function deletePayableAccountAction(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await deletePayableAccount(name);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to delete." };
  }
  revalidatePath("/settings/payable-accounts");
  return { ok: true };
}
