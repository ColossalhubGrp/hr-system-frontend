"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createLeaveApplication,
  decideLeaveApplication,
  type LeaveCreateInput,
} from "@/lib/frappe/leaves";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof LeaveCreateInput, string>>;
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const createSchema = z
  .object({
    employee: z.string().trim().min(1, "Select an employee."),
    leave_type: z.string().trim().min(1, "Select a leave type."),
    from_date: isoDate,
    to_date: isoDate,
    half_day: z.union([z.literal("on"), z.literal("")]).optional(),
    half_day_date: z.string().trim().optional(),
    description: z.string().trim().optional(),
    leave_approver: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /.+@.+\..+/.test(v), "Approver must be a user email."),
  })
  .refine((d) => d.from_date <= d.to_date, {
    message: "End date must be on or after start date.",
    path: ["to_date"],
  });

function toFormState(err: unknown): FormState {
  if (err instanceof FrappeRequestError) {
    const detail = err.detail as
      | { _server_messages?: string; message?: string }
      | undefined;
    if (detail?._server_messages) {
      try {
        const arr = JSON.parse(detail._server_messages) as string[];
        const first = arr[0]
          ? (JSON.parse(arr[0]) as { message?: string })
          : undefined;
        if (first?.message) return { error: stripHtml(first.message) };
      } catch {
        /* fall through */
      }
    }
    if (typeof detail?.message === "string") return { error: detail.message };
    return { error: err.message };
  }
  return { error: "Something went wrong. Try again." };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

export async function createLeaveAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const raw: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") raw[k] = v;
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: FormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof LeaveCreateInput | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors };
  }

  let newId: string;
  try {
    newId = await createLeaveApplication({
      employee: parsed.data.employee,
      leave_type: parsed.data.leave_type,
      from_date: parsed.data.from_date,
      to_date: parsed.data.to_date,
      half_day: parsed.data.half_day === "on",
      half_day_date: parsed.data.half_day_date || undefined,
      description: parsed.data.description || undefined,
      leave_approver: parsed.data.leave_approver || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }

  revalidatePath("/hr/leaves");
  redirect(`/hr/leaves/${encodeURIComponent(newId)}`);
}

export type DecisionState = { error?: string };

export async function approveLeaveAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await decideLeaveApplication(id, "Approved");
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
  revalidatePath("/hr/leaves");
  revalidatePath(`/hr/leaves/${encodeURIComponent(id)}`);
  redirect(`/hr/leaves/${encodeURIComponent(id)}`);
}

export async function rejectLeaveAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await decideLeaveApplication(id, "Rejected");
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
  revalidatePath("/hr/leaves");
  revalidatePath(`/hr/leaves/${encodeURIComponent(id)}`);
  redirect(`/hr/leaves/${encodeURIComponent(id)}`);
}
