"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createCostCenterAllocation,
  updateCostCenterAllocation,
  submitCostCenterAllocation,
  deleteCostCenterAllocation,
} from "@/lib/frappe/budgets/cost-center-allocation";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const pctRowSchema = z.object({ cost_center: z.string().trim().min(1), percentage: z.coerce.number().min(0).max(100) });

const schema = z.object({
  company: z.string().trim().min(1, "Company is required."),
  main_cost_center: z.string().trim().min(1, "Main cost centre is required."),
  valid_from: iso,
  pct_json: z.string().trim().default("[]").transform((s) => { try { return JSON.parse(s); } catch { return []; } }).pipe(z.array(pctRowSchema).min(1)),
}).refine((v) => {
  const total = v.pct_json.reduce((a: number, r: { percentage: number }) => a + r.percentage, 0);
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

type PctRow = z.infer<typeof pctRowSchema>;

function toInput(data: z.infer<typeof schema>) {
  return {
    company: data.company,
    mainCostCenter: data.main_cost_center,
    validFrom: data.valid_from,
    percentages: data.pct_json.map((r: PctRow) => ({ costCenter: r.cost_center, percentage: r.percentage })),
  };
}

export async function createAllocationAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createCostCenterAllocation(toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/cost-centers/allocations");
  redirect(`/accounting/cost-centers/allocations/${encodeURIComponent(created.name)}`);
}

export async function updateAllocationAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try {
    await updateCostCenterAllocation(name, toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/cost-centers/allocations");
  revalidatePath(`/accounting/cost-centers/allocations/${name}`);
  return {};
}

export async function submitAllocationAction(name: string): Promise<FormState> {
  try { await submitCostCenterAllocation(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/cost-centers/allocations");
  revalidatePath(`/accounting/cost-centers/allocations/${name}`);
  return {};
}

export async function deleteAllocationAction(name: string): Promise<FormState> {
  try { await deleteCostCenterAllocation(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/cost-centers/allocations");
  redirect("/accounting/cost-centers/allocations");
}
