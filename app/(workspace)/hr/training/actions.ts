"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  addTrainingEventAttendees,
  createTrainingEvent,
  createTrainingProgram,
  deleteTrainingProgram,
  removeTrainingEventAttendee,
  setTrainingEventStatus,
  updateTrainingEvent,
  updateTrainingProgram,
} from "@/lib/frappe/training";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type FormState = StdFormState;

// datetime-local yields "YYYY-MM-DDTHH:MM" — Frappe wants
// "YYYY-MM-DD HH:MM:SS". This transform converts + adds :00 seconds.
const dateTimeLocal = z
  .string()
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
    "Pick a date and time.",
  )
  .transform((v) => v.replace("T", " ") + (v.length === 16 ? ":00" : ""));

const eventSchema = z
  .object({
    event_name: z.string().trim().min(1, "Give the event a name."),
    // Type accepts any non-empty string — different tenants customise
    // Training Event.type to a Select (default: Internal/External/…)
    // or a Link to their own Training Event Type doctype (this tenant:
    // Conference/Exam/Workshop/…). The form already surfaces only
    // values the tenant will accept via training_form_meta; the
    // validator here just enforces "one was picked".
    type: z.string().trim().min(1, "Pick a type."),
    training_program: z.string().trim().optional(),
    start_time: dateTimeLocal,
    end_time: dateTimeLocal,
    location: z.string().trim().min(1, "Where is it happening?"),
    supplier: z.string().trim().optional(),
    introduction: z
      .string()
      .trim()
      .min(1, "Add a short intro — this appears on attendee invites."),
  })
  .refine((d) => !d.end_time || d.end_time >= d.start_time, {
    message: "End must be on or after start.",
    path: ["end_time"],
  });

const programSchema = z.object({
  training_program_name: z
    .string()
    .trim()
    .min(1, "Give the program a name."),
  company: z.string().trim().min(1, "Pick a company."),
  description: z
    .string()
    .trim()
    .min(1, "A description is required for this program."),
  supplier: z.string().trim().optional(),
  is_public: z
    .union([z.literal("on"), z.literal("off"), z.literal(""), z.undefined()])
    .transform((v) => v === "on"),
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
    return "Only HR admins can add training records.";
  }
  return null;
}

export async function createTrainingEventAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = eventSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  let newId: string;
  try {
    newId = await createTrainingEvent({
      eventName: parsed.data.event_name,
      type: parsed.data.type,
      trainingProgram: parsed.data.training_program || undefined,
      startTime: parsed.data.start_time,
      endTime: parsed.data.end_time,
      location: parsed.data.location || undefined,
      supplier: parsed.data.supplier || undefined,
      introduction: parsed.data.introduction || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/hr/training");
  redirect(`/hr/training/${encodeURIComponent(newId)}`);
}

export async function createTrainingProgramAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = programSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  let newId: string;
  try {
    newId = await createTrainingProgram({
      trainingProgramName: parsed.data.training_program_name,
      description: parsed.data.description,
      company: parsed.data.company,
      supplier: parsed.data.supplier || undefined,
      isPublic: parsed.data.is_public,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/hr/training?tab=programs");
  redirect(`/hr/training?tab=programs`);
}

export async function updateTrainingProgramAction(
  programId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = programSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    await updateTrainingProgram(programId, {
      trainingProgramName: parsed.data.training_program_name,
      description: parsed.data.description,
      company: parsed.data.company,
      supplier: parsed.data.supplier || undefined,
      isPublic: parsed.data.is_public,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/hr/training?tab=programs");
  redirect("/hr/training?tab=programs");
}

export async function deleteTrainingProgramAction(
  programId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await deleteTrainingProgram(programId);
  } catch (err) {
    const state = toFormState(err);
    return { ok: false, error: state.error ?? "Failed to delete program." };
  }
  revalidatePath("/hr/training?tab=programs");
  return { ok: true };
}

export async function updateTrainingEventAction(
  eventId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = eventSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    await updateTrainingEvent(eventId, {
      eventName: parsed.data.event_name,
      type: parsed.data.type,
      trainingProgram: parsed.data.training_program || undefined,
      startTime: parsed.data.start_time,
      endTime: parsed.data.end_time,
      location: parsed.data.location || undefined,
      supplier: parsed.data.supplier || undefined,
      introduction: parsed.data.introduction || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/hr/training");
  revalidatePath(`/hr/training/${encodeURIComponent(eventId)}`);
  redirect(`/hr/training/${encodeURIComponent(eventId)}`);
}

// ── attendee mutations ────────────────────────────────────────────────

const STATUS_ENUM = z.enum([
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
]);

export async function setTrainingEventStatusAction(
  eventId: string,
  status: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  const parsed = STATUS_ENUM.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status." };
  try {
    await setTrainingEventStatus(eventId, parsed.data);
  } catch (err) {
    const s = toFormState(err);
    return { ok: false, error: s.error ?? "Failed to update status." };
  }
  revalidatePath(`/hr/training/${encodeURIComponent(eventId)}`);
  revalidatePath("/hr/training");
  return { ok: true };
}

export async function addTrainingEventAttendeesAction(
  eventId: string,
  employeeIds: string[],
): Promise<
  | { ok: true; added: string[]; skipped: string[] }
  | { ok: false; error: string }
> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  const ids = (employeeIds ?? [])
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  if (ids.length === 0) return { ok: false, error: "Pick at least one employee." };
  try {
    const res = await addTrainingEventAttendees(eventId, ids);
    revalidatePath(`/hr/training/${encodeURIComponent(eventId)}`);
    return { ok: true, added: res.added, skipped: res.skipped };
  } catch (err) {
    const s = toFormState(err);
    return { ok: false, error: s.error ?? "Failed to add attendees." };
  }
}

export async function removeTrainingEventAttendeeAction(
  eventId: string,
  employeeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  if (!employeeId) return { ok: false, error: "Missing employee id." };
  try {
    await removeTrainingEventAttendee(eventId, employeeId);
    revalidatePath(`/hr/training/${encodeURIComponent(eventId)}`);
    return { ok: true };
  } catch (err) {
    const s = toFormState(err);
    return { ok: false, error: s.error ?? "Failed to remove attendee." };
  }
}
