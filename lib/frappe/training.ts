import "server-only";
import { FrappeRequestError, frappeCall } from "./client";

export type TrainingRow = {
  id: string;
  eventName: string;
  type: string | null;
  status: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  supplier: string | null;
  docstatus: 0 | 1 | 2;
};

export type TrainingListResult = {
  rows: TrainingRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: {
    scheduled: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
};

const STATUSES = ["Scheduled", "In Progress", "Completed", "Cancelled"];

export async function listTrainingEvents(opts: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<TrainingListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.status) filters.push(["event_status", "=", opts.status]);

  type Row = {
    name: string;
    event_name: string;
    type: string | null;
    event_status: string;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    supplier: string | null;
    docstatus: 0 | 1 | 2;
  };

  const [rowsRaw, totalRaw, byStatus] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Training Event",
        fields: [
          "name",
          "event_name",
          "type",
          "event_status",
          "start_time",
          "end_time",
          "location",
          "supplier",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "start_time desc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype: "Training Event", filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0),
    Promise.all(
      STATUSES.map((s) =>
        frappeCall<number>({
          method: "frappe.client.get_count",
          args: {
            doctype: "Training Event",
            filters: JSON.stringify([["event_status", "=", s]]),
          },
          as: "user",
        })
          .catch(() => 0)
          .then((c) => [s, Number(c ?? 0)] as const),
      ),
    ),
  ]);

  const counts = Object.fromEntries(byStatus);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      eventName: r.event_name,
      type: r.type,
      status: r.event_status,
      startTime: r.start_time,
      endTime: r.end_time,
      location: r.location,
      supplier: r.supplier,
      docstatus: r.docstatus,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
    counts: {
      scheduled: counts.Scheduled ?? 0,
      inProgress: counts["In Progress"] ?? 0,
      completed: counts.Completed ?? 0,
      cancelled: counts.Cancelled ?? 0,
    },
  };
}

export type TrainingEvent = TrainingRow & {
  description: string | null;
  introduction: string | null;
  trainingProgram: string | null;
  attendees: Array<{
    employee: string;
    employeeName: string | null;
    status: string | null;
    attendance: string | null;
  }>;
};

export async function getTrainingEvent(id: string): Promise<TrainingEvent | null> {
  try {
    type Raw = {
      name: string;
      event_name: string;
      type: string | null;
      event_status: string;
      start_time: string | null;
      end_time: string | null;
      location: string | null;
      supplier: string | null;
      training_program: string | null;
      docstatus: 0 | 1 | 2;
      description: string | null;
      introduction: string | null;
      employees: Array<{
        employee: string;
        employee_name: string | null;
        status: string | null;
        attendance: string | null;
      }>;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Training Event", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      eventName: doc.event_name,
      type: doc.type,
      status: doc.event_status,
      startTime: doc.start_time,
      endTime: doc.end_time,
      location: doc.location,
      supplier: doc.supplier,
      trainingProgram: doc.training_program,
      docstatus: doc.docstatus,
      description: doc.description,
      introduction: doc.introduction,
      attendees: (doc.employees ?? []).map((e) => ({
        employee: e.employee,
        employeeName: e.employee_name,
        status: e.status,
        attendance: e.attendance,
      })),
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export const TRAINING_STATUSES = STATUSES;

// --- Training Programs ----------------------------------------------------

export type TrainingProgramRow = {
  id: string;
  name: string;
  trainingProgramName: string;
  supplier: string | null;
  isPublic: boolean;
  description: string | null;
};

export async function listTrainingPrograms(opts: {
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: TrainingProgramRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  type Row = {
    name: string;
    training_program_name: string;
    supplier: string | null;
    is_public: 0 | 1 | boolean | null;
    description: string | null;
  };

  const [rowsRaw, totalRaw] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Training Program",
        fields: [
          "name",
          "training_program_name",
          "supplier",
          "is_public",
          "description",
        ],
        order_by: "modified desc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype: "Training Program" },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      name: r.name,
      trainingProgramName: r.training_program_name,
      supplier: r.supplier,
      isPublic: Boolean(r.is_public),
      description: r.description,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
  };
}

// ── writes ────────────────────────────────────────────────────────────

export type TrainingEventInput = {
  eventName: string;
  /** Internal / External / Selected / Not Attended (Frappe HR set). */
  type: "Internal" | "External" | "Selected" | "Not Attended";
  /** Optional link to a parent Training Program. */
  trainingProgram?: string;
  /** ISO datetime "YYYY-MM-DD HH:MM:SS" — Frappe rejects Z / +tz. */
  startTime: string;
  /** Optional end. Frappe HR's Training Event does allow a null end
   *  (open-ended sessions) but we default to the same day. */
  endTime?: string;
  location?: string;
  supplier?: string;
  introduction?: string;
  /** Fresh events land as "Scheduled"; admins can move them through
   *  In Progress / Completed / Cancelled from the detail page. */
  status?: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
};

export async function createTrainingEvent(
  input: TrainingEventInput,
): Promise<string> {
  const doc: Record<string, unknown> = {
    doctype: "Training Event",
    event_name: input.eventName,
    type: input.type,
    start_time: input.startTime,
    event_status: input.status ?? "Scheduled",
  };
  if (input.trainingProgram) doc.training_program = input.trainingProgram;
  if (input.endTime) doc.end_time = input.endTime;
  if (input.location) doc.location = input.location;
  if (input.supplier) doc.supplier = input.supplier;
  if (input.introduction) doc.introduction = input.introduction;

  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return saved.name;
}

export type TrainingProgramInput = {
  trainingProgramName: string;
  /** Frappe HR requires Training Program.description on this tenant
   *  (it's marked reqd in the DocType). Empty inserts throw
   *  "Description is required" so the form gates it upfront. */
  description: string;
  /** Frappe HR requires Training Program.company. Match to one of
   *  the tenant's Company records (typically a single one for
   *  single-tenant installs). */
  company: string;
  supplier?: string;
  isPublic?: boolean;
};

export async function createTrainingProgram(
  input: TrainingProgramInput,
): Promise<string> {
  // Frappe HR's Training Program schema on this tenant autonames
  // off `training_program` (not `training_program_name`) and
  // requires `training_program` + `company` + `description`.
  // Sending both field variants + `name` explicitly makes the
  // insert work on vanilla AND customised installs — Frappe
  // silently ignores unrecognised keys.
  const doc: Record<string, unknown> = {
    doctype: "Training Program",
    name: input.trainingProgramName,
    training_program: input.trainingProgramName,
    training_program_name: input.trainingProgramName,
    company: input.company,
    description: input.description,
    is_public: input.isPublic ? 1 : 0,
  };
  if (input.supplier) doc.supplier = input.supplier;

  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return saved.name;
}

/** Full-doc update via frappe.client.save. Child tables (attendees)
 *  aren't set_value-patchable, so any change that might touch them
 *  goes through get + mutate + save. The event form only exposes
 *  parent-level fields so attendees stay intact. */
export async function updateTrainingEvent(
  eventId: string,
  input: TrainingEventInput,
): Promise<void> {
  const doc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Training Event", name: eventId },
    as: "user",
  });
  doc.event_name = input.eventName;
  doc.type = input.type;
  doc.training_program = input.trainingProgram ?? null;
  doc.start_time = input.startTime;
  doc.end_time = input.endTime ?? null;
  doc.location = input.location ?? null;
  doc.supplier = input.supplier ?? null;
  doc.introduction = input.introduction ?? null;
  if (input.status) doc.event_status = input.status;
  await frappeCall<unknown>({
    method: "frappe.client.save",
    verb: "POST",
    args: { doc },
    as: "user",
  });
}

/** Move a Training Event through its status lifecycle without
 *  touching other fields. Uses set_value so the event's child
 *  tables (attendees) are preserved. */
export async function setTrainingEventStatus(
  eventId: string,
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled",
): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.set_value",
    verb: "POST",
    args: {
      doctype: "Training Event",
      name: eventId,
      fieldname: { event_status: status },
    },
    as: "user",
  });
}

/** Append attendees to a Training Event. Fetches the doc, dedupes
 *  against existing employees, appends the new ones as
 *  `Training Event Employee` child rows, saves. Idempotent on the
 *  employee set — re-adding someone already on the list is a no-op. */
export async function addTrainingEventAttendees(
  eventId: string,
  employeeIds: string[],
): Promise<{ added: string[]; skipped: string[] }> {
  const doc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Training Event", name: eventId },
    as: "user",
  });
  const rows = (doc.employees as Array<{ employee: string }> | null) ?? [];
  const existing = new Set(rows.map((r) => r.employee));
  const added: string[] = [];
  const skipped: string[] = [];
  for (const emp of employeeIds) {
    if (existing.has(emp)) {
      skipped.push(emp);
      continue;
    }
    rows.push({
      doctype: "Training Event Employee",
      employee: emp,
      status: "Open",
    } as unknown as { employee: string });
    added.push(emp);
    existing.add(emp);
  }
  if (added.length === 0) return { added, skipped };
  doc.employees = rows;
  await frappeCall<unknown>({
    method: "frappe.client.save",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return { added, skipped };
}

/** Remove an attendee from a Training Event by employee id. Fetches
 *  the doc, drops the matching child row(s), saves. No-op when the
 *  employee isn't on the attendee list. */
export async function removeTrainingEventAttendee(
  eventId: string,
  employeeId: string,
): Promise<void> {
  const doc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Training Event", name: eventId },
    as: "user",
  });
  const rows = (doc.employees as Array<{ employee: string }> | null) ?? [];
  const filtered = rows.filter((r) => r.employee !== employeeId);
  if (filtered.length === rows.length) return;
  doc.employees = filtered;
  await frappeCall<unknown>({
    method: "frappe.client.save",
    verb: "POST",
    args: { doc },
    as: "user",
  });
}

/** Options bundle for the Training Event / Program forms. Pulled
 *  in one call so the create + edit pages don't hit Frappe three
 *  separate times.
 *
 *  * `suppliers` — existing ERPNext Supplier records. Frappe rejects
 *    free-text values on the Supplier Link field with
 *    "Could not find Supplier: <name>" — surfacing the real list
 *    upfront prevents that. Empty on tenants that haven't added
 *    any Suppliers (common for HR-only installs) → forms should
 *    hide the field entirely.
 *
 *  * `eventTypeOptions` — the actual accepted values for Training
 *    Event.type on THIS tenant. Reads the DocField metadata:
 *      - Select field  → newline-split `options` list.
 *      - Link field    → row names from the linked doctype.
 *    Falls back to the vanilla Frappe HR set if metadata isn't
 *    readable, so the form keeps working on default installs. */
export type TrainingFormOptions = {
  suppliers: string[];
  eventTypeOptions: string[];
  /** When empty AND event.typeFieldtype === "Link", the tenant's
   *  Link doctype has no records — form should warn instead of
   *  offering hardcoded values Frappe would reject. */
  eventTypeFieldtype: "Select" | "Link" | null;
  eventTypeLinkDoctype: string | null;
  /** Custom mandatory fields on Training Program that our form
   *  doesn't cover. Surface a warning so admins know to add
   *  them via Frappe HR before using this create surface. */
  programMissingRequired: Array<{ fieldname: string; label: string }>;
};

const FALLBACK_TYPES = ["Internal", "External", "Selected", "Not Attended"];
const OUR_PROGRAM_FIELDS = new Set([
  "name",
  "training_program",
  "training_program_name",
  "description",
  "supplier",
  "is_public",
]);

export async function getTrainingFormOptions(): Promise<TrainingFormOptions> {
  type SupplierRow = { name: string };
  type MetaResponse = {
    event: {
      type_field: {
        fieldtype: "Select" | "Link";
        options: string[];
        link_doctype: string | null;
      } | null;
    };
    program: {
      required_fields: Array<{ fieldname: string; label: string }>;
      autoname?: string;
    };
    supplier: { enabled: boolean };
  };

  // Backend introspection endpoint — uses frappe.get_meta which is
  // the right way to read field defs. Falls back to raw list reads
  // when the backend method isn't deployed yet.
  let meta: MetaResponse | null = null;
  try {
    meta = await frappeCall<MetaResponse>({
      method: "recruitment_app.api.me.training_form_meta",
      as: "user",
    });
  } catch {
    meta = null;
  }

  // Suppliers list — cheap and consistent, still via client.get_list
  // (Supplier is a well-known doctype with permissive perms).
  const supplierRows = meta?.supplier?.enabled === false
    ? []
    : await frappeCall<SupplierRow[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Supplier",
          fields: ["name"],
          order_by: "name asc",
          limit_page_length: 500,
        },
        as: "service",
      }).catch(() => [] as SupplierRow[]);

  let eventTypeOptions: string[] = FALLBACK_TYPES;
  let eventTypeFieldtype: "Select" | "Link" | null = null;
  let eventTypeLinkDoctype: string | null = null;

  if (meta?.event?.type_field) {
    eventTypeFieldtype = meta.event.type_field.fieldtype;
    eventTypeLinkDoctype = meta.event.type_field.link_doctype;
    if (meta.event.type_field.options.length > 0) {
      eventTypeOptions = meta.event.type_field.options;
    } else if (meta.event.type_field.fieldtype === "Link") {
      // Link with zero rows — don't fake the fallback values,
      // Frappe would reject them.
      eventTypeOptions = [];
    }
  }

  const programMissingRequired = (meta?.program?.required_fields ?? [])
    .filter((r) => !OUR_PROGRAM_FIELDS.has(r.fieldname))
    // Filter out `name` — we set it explicitly on insert already.
    .filter((r) => r.fieldname !== "name");

  return {
    suppliers: supplierRows.map((r) => r.name),
    eventTypeOptions,
    eventTypeFieldtype,
    eventTypeLinkDoctype,
    programMissingRequired,
  };
}

/** Pulled once for the event form's Training Program picker. Uses
 *  a lightweight list (name + label only). */
export async function listTrainingProgramOptions(): Promise<
  Array<{ id: string; label: string }>
> {
  type Row = { name: string; training_program_name: string };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Training Program",
      fields: ["name", "training_program_name"],
      order_by: "training_program_name asc",
      limit_page_length: 200,
    },
    as: "user",
  }).catch(() => [] as Row[]);
  return rows.map((r) => ({
    id: r.name,
    label: r.training_program_name || r.name,
  }));
}
