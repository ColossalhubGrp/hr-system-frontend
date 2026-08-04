"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createHolidayList,
  deleteHolidayList,
  updateHolidayList,
} from "@/lib/frappe/holiday-lists";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type HolidayListRowLike = {
  name: string;
  fromDate: string | null;
  toDate: string | null;
  weeklyOff: string | null;
  totalHolidays: number;
};

export type FormState = StdFormState & {
  created?: HolidayListRowLike;
  updated?: HolidayListRowLike;
  /** For update: the name BEFORE the rename so the client can splice
   *  the right row. */
  originalName?: string;
};

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

const nameSchema = z
  .string()
  .trim()
  .min(1, "Required.")
  .max(140, "Keep it short.")
  .refine(
    (v) => !v.includes("/"),
    "Slashes aren't allowed in the name — Frappe uses them internally.",
  );

const createSchema = z
  .object({
    holiday_list_name: nameSchema,
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

const updateSchema = z
  .object({
    original_name: z.string().trim().min(1),
    holiday_list_name: nameSchema,
    from_date: isoDate,
    to_date: isoDate,
    weekly_off: z.enum(weeklyOffValues).optional(),
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

async function requireHrAdmin(): Promise<string | null> {
  const access = await getMyAccess();
  if (!access.isHrAdmin && !access.isItAdmin) {
    return "Only HR admins can manage holiday lists.";
  }
  return null;
}

export async function createHolidayListAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = createSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  let savedName: string;
  try {
    savedName = await createHolidayList({
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
  return {
    created: {
      name: savedName,
      fromDate: parsed.data.from_date,
      toDate: parsed.data.to_date,
      weeklyOff: parsed.data.weekly_off || null,
      totalHolidays: 0,
    },
  };
}

export async function updateHolidayListAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = updateSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  let finalName: string;
  try {
    finalName = await updateHolidayList({
      originalName: parsed.data.original_name,
      holiday_list_name: parsed.data.holiday_list_name,
      from_date: parsed.data.from_date,
      to_date: parsed.data.to_date,
      weekly_off: parsed.data.weekly_off || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/holiday-lists");
  return {
    updated: {
      name: finalName,
      fromDate: parsed.data.from_date,
      toDate: parsed.data.to_date,
      weeklyOff: parsed.data.weekly_off || null,
      totalHolidays: 0, // client keeps the previous count when splicing
    },
    originalName: parsed.data.original_name,
  };
}

export async function deleteHolidayListAction(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await deleteHolidayList(name);
  } catch (err) {
    const state = toFormState(err);
    return { ok: false, error: state.error ?? "Failed to delete." };
  }
  revalidatePath("/settings/holiday-lists");
  return { ok: true };
}
