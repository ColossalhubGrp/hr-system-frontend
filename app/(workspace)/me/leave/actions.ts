"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createMyLeaveApplication } from "@/lib/frappe/my-self-service";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const schema = z
  .object({
    leave_type: z.string().trim().min(1, "Pick a leave type."),
    from_date: isoDate,
    to_date: isoDate,
    description: z.string().trim().optional(),
    half_day: z.union([z.literal("on"), z.literal("")]).optional(),
  })
  .refine((d) => d.to_date >= d.from_date, {
    message: "End date must be on or after start date.",
    path: ["to_date"],
  });

export type ApplyForLeaveState = StdFormState;

function fieldErrors(parsed: z.SafeParseError<unknown>): ApplyForLeaveState {
  const out: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

export async function applyForLeaveAction(
  _prev: ApplyForLeaveState,
  form: FormData,
): Promise<ApplyForLeaveState> {
  const parsed = schema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    await createMyLeaveApplication({
      leave_type: parsed.data.leave_type,
      from_date: parsed.data.from_date,
      to_date: parsed.data.to_date,
      description: parsed.data.description,
      half_day: parsed.data.half_day === "on",
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/me");
  revalidatePath("/me/leave");
  redirect("/me/leave");
}
