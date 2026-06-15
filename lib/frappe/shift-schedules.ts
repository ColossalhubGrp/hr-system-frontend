import "server-only";
import { FrappeRequestError, frappeCall } from "./client";
import { createShiftAssignment } from "./shifts";
import { fetchHolidayDates } from "./day-rates";

/** Day-of-week bit-set order matches JS Date.getDay() — Sun=0, Sat=6. */
export const DOW_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;
export type DowKey = (typeof DOW_KEYS)[number];

// ============================== Shift Schedule ==============================

export type ShiftScheduleRow = {
  id: string;
  scheduleName: string;
  shiftType: string;
  company: string | null;
  enabled: boolean;
  /** Order: Mon,Tue,Wed,Thu,Fri,Sat,Sun — same as the docs. */
  daysSummary: string;
};

export type ShiftScheduleFull = {
  id: string;
  scheduleName: string;
  shiftType: string;
  company: string | null;
  holidayList: string | null;
  enabled: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  notes: string | null;
};

function dowSummary(d: ShiftScheduleFull): string {
  const labels: Array<[boolean, string]> = [
    [d.monday, "Mon"],
    [d.tuesday, "Tue"],
    [d.wednesday, "Wed"],
    [d.thursday, "Thu"],
    [d.friday, "Fri"],
    [d.saturday, "Sat"],
    [d.sunday, "Sun"],
  ];
  return labels
    .filter(([on]) => on)
    .map(([, l]) => l)
    .join(", ");
}

export async function listShiftSchedules(opts: {
  enabled?: "Yes" | "No";
  page?: number;
  pageSize?: number;
} = {}): Promise<{
  rows: ShiftScheduleRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string | number]> = [];
  if (opts.enabled === "Yes") filters.push(["enabled", "=", 1]);
  if (opts.enabled === "No") filters.push(["enabled", "=", 0]);

  type Raw = {
    name: string;
    schedule_name: string;
    shift_type: string;
    company: string | null;
    enabled: 0 | 1 | boolean | null;
    monday: 0 | 1 | boolean | null;
    tuesday: 0 | 1 | boolean | null;
    wednesday: 0 | 1 | boolean | null;
    thursday: 0 | 1 | boolean | null;
    friday: 0 | 1 | boolean | null;
    saturday: 0 | 1 | boolean | null;
    sunday: 0 | 1 | boolean | null;
  };

  const [rowsRaw, totalRaw] = await Promise.all([
    frappeCall<Raw[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Shift Schedule",
        // Days don't have in_list_view so they aren't projectable here. We
        // grab them via per-row gets in the rare case the list view needs them
        // — for the row summary we'll need separate fetches.
        fields: [
          "name",
          "schedule_name",
          "shift_type",
          "company",
          "enabled",
        ],
        filters: JSON.stringify(filters),
        order_by: "schedule_name asc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Raw[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype: "Shift Schedule", filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0),
  ]);

  // Hydrate day flags per row via parallel gets — number of schedules will
  // never be large enough for this to matter.
  const dayHydrate = await Promise.all(
    rowsRaw.map((r) =>
      frappeCall<ShiftScheduleFull>({
        method: "frappe.client.get",
        args: { doctype: "Shift Schedule", name: r.name },
        as: "user",
      }).catch(() => null),
    ),
  );

  const rows = rowsRaw.map<ShiftScheduleRow>((r, i) => {
    const full = dayHydrate[i];
    return {
      id: r.name,
      scheduleName: r.schedule_name,
      shiftType: r.shift_type,
      company: r.company,
      enabled: Boolean(r.enabled),
      daysSummary: full ? dowSummary(full) : "—",
    };
  });

  return { rows, total: Number(totalRaw ?? 0), page, pageSize };
}

export async function getShiftSchedule(
  id: string,
): Promise<ShiftScheduleFull | null> {
  try {
    type Raw = ShiftScheduleFull & {
      name: string;
      enabled: 0 | 1 | boolean | null;
      monday: 0 | 1 | boolean | null;
      tuesday: 0 | 1 | boolean | null;
      wednesday: 0 | 1 | boolean | null;
      thursday: 0 | 1 | boolean | null;
      friday: 0 | 1 | boolean | null;
      saturday: 0 | 1 | boolean | null;
      sunday: 0 | 1 | boolean | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Shift Schedule", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      scheduleName: doc.scheduleName ?? (doc as unknown as { schedule_name: string }).schedule_name,
      shiftType: doc.shiftType ?? (doc as unknown as { shift_type: string }).shift_type,
      company: doc.company,
      holidayList: doc.holidayList ?? (doc as unknown as { holiday_list: string | null }).holiday_list,
      enabled: Boolean(doc.enabled),
      monday: Boolean(doc.monday),
      tuesday: Boolean(doc.tuesday),
      wednesday: Boolean(doc.wednesday),
      thursday: Boolean(doc.thursday),
      friday: Boolean(doc.friday),
      saturday: Boolean(doc.saturday),
      sunday: Boolean(doc.sunday),
      notes: doc.notes,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export type ShiftScheduleInput = {
  schedule_name: string;
  shift_type: string;
  company?: string;
  holiday_list?: string;
  enabled?: boolean;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
  notes?: string;
};

function compact<T extends Record<string, unknown>>(o: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

function boolToInt(b: boolean | undefined): 0 | 1 | undefined {
  if (b === undefined) return undefined;
  return b ? 1 : 0;
}

export async function createShiftSchedule(
  input: ShiftScheduleInput,
): Promise<string> {
  const doc = {
    doctype: "Shift Schedule",
    ...compact({
      schedule_name: input.schedule_name,
      shift_type: input.shift_type,
      company: input.company,
      holiday_list: input.holiday_list,
      enabled: boolToInt(input.enabled ?? true),
      monday: boolToInt(input.monday),
      tuesday: boolToInt(input.tuesday),
      wednesday: boolToInt(input.wednesday),
      thursday: boolToInt(input.thursday),
      friday: boolToInt(input.friday),
      saturday: boolToInt(input.saturday),
      sunday: boolToInt(input.sunday),
      notes: input.notes,
    }),
  };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

export async function updateShiftSchedule(
  id: string,
  input: Partial<ShiftScheduleInput>,
): Promise<void> {
  const payload = compact({
    shift_type: input.shift_type,
    company: input.company,
    holiday_list: input.holiday_list,
    enabled: boolToInt(input.enabled),
    monday: boolToInt(input.monday),
    tuesday: boolToInt(input.tuesday),
    wednesday: boolToInt(input.wednesday),
    thursday: boolToInt(input.thursday),
    friday: boolToInt(input.friday),
    saturday: boolToInt(input.saturday),
    sunday: boolToInt(input.sunday),
    notes: input.notes,
  });
  await frappeCall<{ name: string }>({
    method: "frappe.client.set_value",
    args: { doctype: "Shift Schedule", name: id, fieldname: payload },
    verb: "POST",
    as: "user",
  });
}

export async function deleteShiftSchedule(id: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    args: { doctype: "Shift Schedule", name: id },
    verb: "POST",
    as: "user",
  });
}

// ============================ Schedule Assignment ===========================

export type ShiftScheduleAssignmentRow = {
  id: string;
  shiftSchedule: string;
  employee: string;
  employeeName: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  company: string | null;
};

export async function listShiftScheduleAssignments(opts: {
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{
  rows: ShiftScheduleAssignmentRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.status) filters.push(["status", "=", opts.status]);

  type Raw = {
    name: string;
    shift_schedule: string;
    employee: string;
    employee_name: string | null;
    start_date: string;
    end_date: string | null;
    status: string;
    company: string | null;
  };

  const [rowsRaw, totalRaw] = await Promise.all([
    frappeCall<Raw[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Shift Schedule Assignment",
        fields: [
          "name",
          "shift_schedule",
          "employee",
          "employee_name",
          "start_date",
          "end_date",
          "status",
          "company",
        ],
        filters: JSON.stringify(filters),
        order_by: "start_date desc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Raw[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Shift Schedule Assignment",
        filters: JSON.stringify(filters),
      },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      shiftSchedule: r.shift_schedule,
      employee: r.employee,
      employeeName: r.employee_name,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
      company: r.company,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
  };
}

export type ShiftScheduleAssignmentFull = ShiftScheduleAssignmentRow & {
  notes: string | null;
};

export async function getShiftScheduleAssignment(
  id: string,
): Promise<ShiftScheduleAssignmentFull | null> {
  try {
    type Raw = {
      name: string;
      shift_schedule: string;
      employee: string;
      employee_name: string | null;
      start_date: string;
      end_date: string | null;
      status: string;
      company: string | null;
      notes: string | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Shift Schedule Assignment", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      shiftSchedule: doc.shift_schedule,
      employee: doc.employee,
      employeeName: doc.employee_name,
      startDate: doc.start_date,
      endDate: doc.end_date,
      status: doc.status,
      company: doc.company,
      notes: doc.notes,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export type ShiftScheduleAssignmentInput = {
  shift_schedule: string;
  employee: string;
  start_date: string;
  end_date?: string;
  status?: "Active" | "Inactive";
  company?: string;
  notes?: string;
};

export async function createShiftScheduleAssignment(
  input: ShiftScheduleAssignmentInput,
): Promise<string> {
  const doc = {
    doctype: "Shift Schedule Assignment",
    status: "Active",
    ...compact(input),
  };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

export async function updateShiftScheduleAssignment(
  id: string,
  input: Partial<ShiftScheduleAssignmentInput>,
): Promise<void> {
  await frappeCall<{ name: string }>({
    method: "frappe.client.set_value",
    args: {
      doctype: "Shift Schedule Assignment",
      name: id,
      fieldname: compact(input),
    },
    verb: "POST",
    as: "user",
  });
}

export async function deleteShiftScheduleAssignment(id: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    args: { doctype: "Shift Schedule Assignment", name: id },
    verb: "POST",
    as: "user",
  });
}

// ============================== Materialisation =============================

export type MaterialiseResult = {
  /** Number of dates that matched the schedule and were materialised. */
  created: number;
  /** Dates skipped because they were a holiday or off-day. */
  skipped: number;
  /** Per-date failures (overlap, validation, …). */
  failures: Array<{ date: string; error: string }>;
};

/**
 * Walk `[from, to]` inclusively, and for each date that the schedule's
 * weekday flag allows AND that's not on its holiday list, create a single-day
 * Shift Assignment for the employee on the schedule's Shift Type.
 */
export async function materialiseScheduleRange(args: {
  scheduleId: string;
  employee: string;
  from: string;
  to: string;
  company?: string;
}): Promise<MaterialiseResult> {
  const sched = await getShiftSchedule(args.scheduleId);
  if (!sched) {
    return {
      created: 0,
      skipped: 0,
      failures: [{ date: "—", error: "Schedule not found." }],
    };
  }
  const flags: Record<DowKey, boolean> = {
    sunday: sched.sunday,
    monday: sched.monday,
    tuesday: sched.tuesday,
    wednesday: sched.wednesday,
    thursday: sched.thursday,
    friday: sched.friday,
    saturday: sched.saturday,
  };
  const holidays = await fetchHolidayDates(sched.holidayList);

  const out: MaterialiseResult = { created: 0, skipped: 0, failures: [] };
  const [fy, fm, fd] = args.from.split("-").map(Number);
  const [ty, tm, td] = args.to.split("-").map(Number);
  const cursor = new Date(fy!, fm! - 1, fd!);
  const end = new Date(ty!, tm! - 1, td!);
  // Guard against runaway ranges — we'd hit Frappe rate limits long before
  // anyone legitimately needs a year of one-day assignments per employee.
  let iterations = 0;
  while (cursor <= end) {
    iterations++;
    if (iterations > 366) {
      out.failures.push({
        date: "—",
        error: "Range too wide; cap to under a year.",
      });
      break;
    }
    const dow = DOW_KEYS[cursor.getDay()]!;
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const allowed = flags[dow];
    const onHoliday = holidays.has(iso);
    if (!allowed || onHoliday) {
      out.skipped++;
    } else {
      try {
        await createShiftAssignment({
          employee: args.employee,
          shift_type: sched.shiftType,
          start_date: iso,
          end_date: iso,
          company: args.company,
        });
        out.created++;
      } catch (err) {
        out.failures.push({
          date: iso,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
