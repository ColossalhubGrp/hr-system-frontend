"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  bulkAllocateFromPolicy,
  createLeavePolicy,
  deleteLeavePolicy,
  updateLeavePolicy,
  type LeavePolicyRow,
} from "@/lib/frappe/leave-policies";
import { getMyAccess } from "@/lib/frappe/roles";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";

export type FormState = StdFormState & {
  created?: LeavePolicyRow;
  updated?: LeavePolicyRow;
  originalName?: string;
};

const detailSchema = z.object({
  leaveType: z.string().trim().min(1, "Pick a leave type."),
  annualAllocation: z.coerce
    .number({ invalid_type_error: "Enter a number." })
    .min(0, "Can't be negative.")
    .max(365, "Cap at 365 days."),
});

const baseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the policy a name.")
    .max(140, "Keep it short.")
    .refine(
      (v) => !v.includes("/"),
      "Slashes aren't allowed — Frappe uses them internally.",
    ),
  details: z
    .array(detailSchema)
    .min(1, "Add at least one leave type row.")
    .refine(
      (rows) => new Set(rows.map((r) => r.leaveType)).size === rows.length,
      "Each leave type can only appear once in a policy.",
    ),
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick a valid date.");

const bulkSchema = z
  .object({
    policy: z.string().trim().min(1),
    from_date: isoDate,
    to_date: isoDate,
    company: z.string().trim().optional(),
    department: z.string().trim().optional(),
  })
  .refine((d) => d.to_date >= d.from_date, {
    message: "End date must be on or after start date.",
    path: ["to_date"],
  });

async function requireHrAdmin(): Promise<string | null> {
  const access = await getMyAccess();
  if (!access.isHrAdmin && !access.isItAdmin) {
    return "Only HR admins can manage leave policies.";
  }
  return null;
}

function toRow(name: string, data: z.infer<typeof baseSchema>): LeavePolicyRow {
  return {
    name,
    title: data.title,
    details: data.details.map((d) => ({
      leaveType: d.leaveType,
      annualAllocation: d.annualAllocation,
    })),
    totalDays: data.details.reduce((s, r) => s + r.annualAllocation, 0),
  };
}

export async function createLeavePolicyAction(
  input: unknown,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.",
    };
  }
  let savedName: string;
  try {
    savedName = await createLeavePolicy({
      title: parsed.data.title,
      details: parsed.data.details,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/leave-policies");
  return { created: toRow(savedName, parsed.data) };
}

export async function updateLeavePolicyAction(
  originalName: string,
  input: unknown,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the highlighted fields.",
    };
  }
  try {
    await updateLeavePolicy(originalName, {
      title: parsed.data.title,
      details: parsed.data.details,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/leave-policies");
  return {
    updated: toRow(originalName, parsed.data),
    originalName,
  };
}

export async function deleteLeavePolicyAction(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await deleteLeavePolicy(name);
  } catch (err) {
    const state = toFormState(err);
    return { ok: false, error: state.error ?? "Failed to delete." };
  }
  revalidatePath("/settings/leave-policies");
  return { ok: true };
}

export type BulkResult =
  | {
      ok: true;
      summary: {
        employees: number;
        policy_details: number;
        created: number;
        updated: number;
        unchanged: number;
        errors: Array<{ employee: string; leave_type: string; error: string }>;
      };
    }
  | { ok: false; error: string };

export async function bulkAllocateAction(input: unknown): Promise<BulkResult> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the inputs.",
    };
  }
  try {
    const summary = await bulkAllocateFromPolicy({
      policy: parsed.data.policy,
      fromDate: parsed.data.from_date,
      toDate: parsed.data.to_date,
      company: parsed.data.company || undefined,
      department: parsed.data.department || undefined,
    });
    revalidatePath("/settings/leave-policies");
    return { ok: true, summary };
  } catch (err) {
    const state = toFormState(err);
    return { ok: false, error: state.error ?? "Allocation failed." };
  }
}
