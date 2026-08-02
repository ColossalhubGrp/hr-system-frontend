"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createHolidayList } from "@/lib/frappe/holiday-lists";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type FormState = StdFormState;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const weeklyOffValues = [
  "",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const createSchema = z
  .object({
    holiday_list_name: z.string().trim().min(1, "Required."),
    from_date: isoDate,
    to_date: isoDate,
    weekly_off: z.enum(weeklyOffValues).optional(),
    color: z.string().trim().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.from_date > d.to_date) {
      ctx.addIssue({
        code: "custom",
        path: ["to_date"],
        message: "To date must be on or after From date.",
      });
    }
  });

function fieldErrors(parsed: z.SafeParseError<unknown>): FormState {
  const out: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

export async function createHolidayListAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const access = await getMyAccess();
  if (!access.isHrAdmin && !access.isItAdmin) {
    return { error: "Only HR admins can create holiday lists." };
  }
  const parsed = createSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    await createHolidayList({
      holiday_list_name: parsed.data.holiday_list_name,
      from_date: parsed.data.from_date,
      to_date: parsed.data.to_date,
      weekly_off: parsed.data.weekly_off || undefined,
      color: parsed.data.color || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/holiday-lists");
  return {};
}
