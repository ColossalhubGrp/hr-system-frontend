"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelAdminDoc,
  createTravelRequest,
  submitAdminDoc,
} from "@/lib/frappe/finance-training";
import { formToRecord, toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type FormState = StdFormState;

const costingSchema = z.object({
  expense_type: z.string().trim().min(1, "Give this expense a name."),
  amount: z.coerce.number().nonnegative("Amount can't be negative."),
  currency: z.string().trim().optional(),
  funded_amount: z.coerce.number().nonnegative().optional(),
});

const itinerarySchema = z.object({
  departure_date: z.string().trim().min(1),
  from_location: z.string().trim().min(1),
  to_location: z.string().trim().min(1),
  mode_of_transport: z.string().trim().optional(),
  cost: z.coerce.number().nonnegative().optional(),
});

const schema = z
  .object({
    employee: z.string().trim().min(1, "Pick an employee."),
    travel_type: z.enum(["Domestic", "International"]),
    travel_funding: z.enum([
      "Fully Sponsored",
      "Partially Sponsored",
      "Fully Sponsored by Employee",
    ]),
    from_date: z.string().trim().min(1, "Pick a start date."),
    to_date: z.string().trim().min(1, "Pick an end date."),
    purpose_of_travel: z.string().trim().min(1, "Explain the purpose."),
    travel_advance_required: z.union([z.literal("on"), z.string(), z.undefined()])
      .transform((v) => v === "on"),
    costings_json: z.string().optional().transform((v) => (v ? JSON.parse(v) : [])),
    itinerary_json: z.string().optional().transform((v) => (v ? JSON.parse(v) : [])),
  })
  .refine((d) => d.to_date >= d.from_date, {
    message: "End date must be on/after start.",
    path: ["to_date"],
  });

async function requireHrAdmin(): Promise<string | null> {
  const a = await getMyAccess();
  if (!a.isHrAdmin && !a.isItAdmin) return "Only HR admins can manage travel requests.";
  return null;
}

function fieldErrors(parsed: z.SafeParseError<unknown>): FormState {
  const out: Record<string, string> = {};
  for (const i of parsed.error.issues) {
    const k = String(i.path[0] ?? "");
    if (k && !out[k]) out[k] = i.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

export async function createTravelRequestAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = schema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  const costings = z.array(costingSchema).safeParse(parsed.data.costings_json);
  const itinerary = z.array(itinerarySchema).safeParse(parsed.data.itinerary_json);
  if (!costings.success) return { error: "One of the cost lines is invalid." };
  if (!itinerary.success) return { error: "One of the itinerary rows is invalid." };
  let id: string;
  try {
    id = await createTravelRequest({
      employee: parsed.data.employee,
      travelType: parsed.data.travel_type,
      travelFunding: parsed.data.travel_funding,
      fromDate: parsed.data.from_date,
      toDate: parsed.data.to_date,
      purposeOfTravel: parsed.data.purpose_of_travel,
      travelAdvanceRequired: parsed.data.travel_advance_required,
      costings: costings.data,
      itinerary: itinerary.data,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/hr/travel");
  redirect(`/hr/travel/${encodeURIComponent(id)}`);
}

export async function submitTravelAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await submitAdminDoc("Travel Request", id);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to submit." };
  }
  revalidatePath(`/hr/travel/${encodeURIComponent(id)}`);
  revalidatePath("/hr/travel");
  return { ok: true };
}

export async function cancelTravelAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await cancelAdminDoc("Travel Request", id);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to cancel." };
  }
  revalidatePath(`/hr/travel/${encodeURIComponent(id)}`);
  revalidatePath("/hr/travel");
  return { ok: true };
}
