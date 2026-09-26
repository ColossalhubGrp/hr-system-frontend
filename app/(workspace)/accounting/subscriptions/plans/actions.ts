"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  INTERVALS,
  PRICE_MODES,
} from "@/lib/frappe/subscriptions/plan";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const opt = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  plan_name: z.string().trim().min(1, "Plan name is required."),
  item: opt,
  cost: z.coerce.number().min(0).default(0),
  currency: z.string().trim().min(1, "Currency is required.").default("USD"),
  billing_interval: z.enum(INTERVALS as unknown as [string, ...string[]]),
  billing_interval_count: z.coerce.number().int().min(1).default(1),
  price_determination: z.enum(PRICE_MODES as unknown as [string, ...string[]]),
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

function toInput(data: z.infer<typeof schema>) {
  return {
    planName: data.plan_name,
    item: data.item,
    cost: data.cost,
    currency: data.currency,
    billingInterval: data.billing_interval,
    billingIntervalCount: data.billing_interval_count,
    priceDetermination: data.price_determination,
  };
}

export async function createPlanAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createSubscriptionPlan(toInput(parsed.data));
  } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/subscriptions/plans");
  redirect(`/accounting/subscriptions/plans/${encodeURIComponent(created.name)}`);
}

export async function updatePlanAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try { await updateSubscriptionPlan(name, toInput(parsed.data)); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/subscriptions/plans");
  revalidatePath(`/accounting/subscriptions/plans/${name}`);
  return {};
}

export async function deletePlanAction(name: string): Promise<FormState> {
  try { await deleteSubscriptionPlan(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/subscriptions/plans");
  redirect("/accounting/subscriptions/plans");
}
