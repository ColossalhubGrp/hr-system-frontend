"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createMonthlyDistribution,
  updateMonthlyDistribution,
  deleteMonthlyDistribution,
} from "@/lib/frappe/budgets/monthly-distribution";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const rowSchema = z.object({ month: z.string(), percentage_allocation: z.coerce.number().min(0).max(100) });

const createSchema = z.object({
  distribution_id: z.string().trim().min(1, "Name is required."),
  fiscal_year: z.string().trim().optional(),
  pct_json: z.string().trim().default("[]").transform((s) => { try { return JSON.parse(s); } catch { return []; } }).pipe(z.array(rowSchema)),
}).refine((v) => {
  const total = v.pct_json.reduce((a: number, r: { percentage_allocation: number }) => a + r.percentage_allocation, 0);
  return Math.abs(total - 100) < 0.01;
}, { message: "Percentages must add up to 100.", path: ["pct_json"] });

const editSchema = createSchema.innerType().omit({ distribution_id: true }).refine((v) => {
  const total = v.pct_json.reduce((a: number, r: { percentage_allocation: number }) => a + r.percentage_allocation, 0);
  return Math.abs(total - 100) < 0.01;
}, { message: "Percentages must add up to 100.", path: ["pct_json"] });

function toFormState(err: unknown): FormState {
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (digest === "NEXT_NOT_FOUND") throw err;
  }
  if (err instanceof FrappeRequestError) return { error: err.message || `Backend error (${err.status}).` };
  return { error: err instanceof Error ? err.message : "Something went wrong." };
}

export async function createMonthlyDistributionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
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
    created = await createMonthlyDistribution({
      distributionId: parsed.data.distribution_id,
      fiscalYear: parsed.data.fiscal_year || undefined,
      percentages: parsed.data.pct_json.map((r: { month: string; percentage_allocation: number }) => ({ month: r.month, percentageAllocation: r.percentage_allocation })),
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/monthly-distribution");
  redirect(`/accounting/masters/monthly-distribution/${encodeURIComponent(created.name)}`);
}

export async function updateMonthlyDistributionAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = editSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try {
    await updateMonthlyDistribution(name, {
      fiscalYear: parsed.data.fiscal_year || undefined,
      percentages: parsed.data.pct_json.map((r: { month: string; percentage_allocation: number }) => ({ month: r.month, percentageAllocation: r.percentage_allocation })),
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/monthly-distribution");
  revalidatePath(`/accounting/masters/monthly-distribution/${name}`);
  return {};
}

export async function deleteMonthlyDistributionAction(name: string): Promise<FormState> {
  try {
    await deleteMonthlyDistribution(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/monthly-distribution");
  redirect("/accounting/masters/monthly-distribution");
}
