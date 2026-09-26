"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createCustomerGroup,
  updateCustomerGroup,
  deleteCustomerGroup,
} from "@/lib/frappe/sales/customer-group";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const opt = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  customer_group_name: z.string().trim().min(1, "Name is required."),
  parent_customer_group: opt,
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

export async function createCustomerGroupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: { customer_group_name: parsed.error.issues[0]?.message ?? "" }, error: "Please fix the highlighted fields." };
  }
  let created: { name: string };
  try {
    created = await createCustomerGroup({
      customerGroupName: parsed.data.customer_group_name,
      parent: parsed.data.parent_customer_group,
      isGroup: parsed.data.is_group,
    });
  } catch (err) { return toFormState(err); }
  revalidatePath("/sales/customer-groups");
  // Save = done → back to the list.
  redirect("/sales/customer-groups");
}

export async function updateCustomerGroupAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: { customer_group_name: parsed.error.issues[0]?.message ?? "" }, error: "Please fix the highlighted fields." };
  }
  try {
    await updateCustomerGroup(name, {
      customerGroupName: parsed.data.customer_group_name,
      parent: parsed.data.parent_customer_group,
      isGroup: parsed.data.is_group,
    });
  } catch (err) { return toFormState(err); }
  revalidatePath("/sales/customer-groups");
  revalidatePath(`/sales/customer-groups/${name}`);
  redirect("/sales/customer-groups");
}

export async function deleteCustomerGroupAction(name: string): Promise<FormState> {
  try { await deleteCustomerGroup(name); } catch (err) { return toFormState(err); }
  revalidatePath("/sales/customer-groups");
  redirect("/sales/customer-groups");
}
