"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createTrainingSupplier,
  deleteTrainingSupplier,
  updateTrainingSupplier,
} from "@/lib/frappe/training-suppliers";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type FormState = StdFormState & { savedName?: string };

const schema = z.object({
  supplier_name: z.string().trim().min(1, "Supplier name is required."),
  contact_name: z.string().trim().optional(),
  contact_email: z.string().trim().optional(),
  contact_phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

async function requireHrAdmin(): Promise<string | null> {
  const a = await getMyAccess();
  if (!a.isHrAdmin && !a.isItAdmin) return "Only HR admins can manage suppliers.";
  return null;
}

export async function saveTrainingSupplierAction(
  originalName: string | null,
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
  const input = {
    supplierName: parsed.data.supplier_name,
    contactName: parsed.data.contact_name || undefined,
    contactEmail: parsed.data.contact_email || undefined,
    contactPhone: parsed.data.contact_phone || undefined,
    website: parsed.data.website || undefined,
    notes: parsed.data.notes || undefined,
  };
  try {
    if (originalName) {
      await updateTrainingSupplier(originalName, input);
    } else {
      await createTrainingSupplier(input);
    }
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/training-suppliers");
  return { savedName: input.supplierName };
}

export async function deleteTrainingSupplierAction(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await deleteTrainingSupplier(name);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to delete." };
  }
  revalidatePath("/settings/training-suppliers");
  return { ok: true };
}
