"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSupplierGroup,
  updateSupplierGroup,
  deleteSupplierGroup,
} from "@/lib/frappe/buying/supplier-group";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const opt = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  supplier_group_name: z.string().trim().min(1, "Name is required."),
  parent_supplier_group: opt,
  is_group: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
});

function toFormState(err: unknown): FormState {
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (digest === "NEXT_NOT_FOUND") throw err;
  }
  if (err instanceof FrappeRequestError) return { error: err.message || `Save failed (${err.status}).` };
  return { error: err instanceof Error ? err.message : "Something went wrong." };
}

export async function createSupplierGroupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: { supplier_group_name: parsed.error.issues[0]?.message ?? "" }, error: "Please fix the highlighted fields." };
  }
  let created: { name: string };
  try {
    created = await createSupplierGroup({
      supplierGroupName: parsed.data.supplier_group_name,
      parent: parsed.data.parent_supplier_group,
      isGroup: parsed.data.is_group,
    });
  } catch (err) { return toFormState(err); }
  revalidatePath("/buying/supplier-groups");
  // Save = done → back to the list.
  redirect("/buying/supplier-groups");
}

export async function updateSupplierGroupAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: { supplier_group_name: parsed.error.issues[0]?.message ?? "" }, error: "Please fix the highlighted fields." };
  }
  try {
    await updateSupplierGroup(name, {
      supplierGroupName: parsed.data.supplier_group_name,
      parent: parsed.data.parent_supplier_group,
      isGroup: parsed.data.is_group,
    });
  } catch (err) { return toFormState(err); }
  revalidatePath("/buying/supplier-groups");
  revalidatePath(`/buying/supplier-groups/${name}`);
  redirect("/buying/supplier-groups");
}

export async function deleteSupplierGroupAction(name: string): Promise<FormState> {
  try { await deleteSupplierGroup(name); } catch (err) { return toFormState(err); }
  revalidatePath("/buying/supplier-groups");
  redirect("/buying/supplier-groups");
}
