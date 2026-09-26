"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSubscription,
  updateSubscription,
  cancelSubscription,
  deleteSubscription,
} from "@/lib/frappe/subscriptions/subscription";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const planSchema = z.object({ plan: z.string().trim().min(1), qty: z.coerce.number().min(0).default(1) });

const schema = z.object({
  party_type: z.string().trim().min(1),
  party: z.string().trim().min(1, "Party is required."),
  company: z.string().trim().min(1, "Company is required."),
  start_date: iso,
  end_date: z.string().trim().optional(),
  days_until_due: z.coerce.number().int().min(0).default(0),
  follow_calendar_months: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  generate_new_invoices_past_due_date: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  submit_invoice: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  generate_invoice_at: z.string().default("End of the current subscription period"),
  plans_json: z.string().trim().default("[]").transform((s) => { try { return JSON.parse(s); } catch { return []; } }).pipe(z.array(planSchema).min(1, "Add at least one plan.")),
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

type PlanRow = z.infer<typeof planSchema>;

function toInput(data: z.infer<typeof schema>) {
  return {
    partyType: data.party_type,
    party: data.party,
    company: data.company,
    startDate: data.start_date,
    endDate: data.end_date || undefined,
    daysUntilDue: data.days_until_due,
    followCalendarMonths: data.follow_calendar_months,
    generateNewInvoicesPastDueDate: data.generate_new_invoices_past_due_date,
    submitInvoice: data.submit_invoice,
    generateInvoiceAt: data.generate_invoice_at,
    plans: data.plans_json.map((p: PlanRow) => ({ plan: p.plan, qty: p.qty })),
  };
}

export async function createSubscriptionAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createSubscription(toInput(parsed.data));
  } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/subscriptions");
  redirect(`/accounting/subscriptions/${encodeURIComponent(created.name)}`);
}

export async function updateSubscriptionAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try { await updateSubscription(name, toInput(parsed.data)); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/subscriptions");
  revalidatePath(`/accounting/subscriptions/${name}`);
  return {};
}

export async function cancelSubscriptionAction(name: string): Promise<FormState> {
  try { await cancelSubscription(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/subscriptions");
  revalidatePath(`/accounting/subscriptions/${name}`);
  return {};
}

export async function deleteSubscriptionAction(name: string): Promise<FormState> {
  try { await deleteSubscription(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/subscriptions");
  redirect("/accounting/subscriptions");
}
