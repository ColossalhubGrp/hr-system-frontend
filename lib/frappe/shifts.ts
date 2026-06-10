import "server-only";
import { FrappeRequestError, frappeCall } from "./client";

export type ShiftType = {
  name: string;
  startTime: string | null;
  endTime: string | null;
  color: string | null;
  enableAutoAttendance: boolean;
  assignedCount: number;
};

export type ShiftAssignment = {
  id: string;
  employee: string;
  employeeName: string | null;
  shiftType: string;
  startDate: string;
  endDate: string | null;
  status: string;
  docstatus: 0 | 1 | 2;
};

export type ShiftBoard = {
  types: ShiftType[];
  active: ShiftAssignment[];
};

export async function fetchShiftBoard(): Promise<ShiftBoard> {
  type RawType = {
    name: string;
    start_time: string | null;
    end_time: string | null;
  };
  type RawAssign = {
    name: string;
    employee: string;
    employee_name: string | null;
    shift_type: string;
    start_date: string;
    end_date: string | null;
    status: string;
    docstatus: 0 | 1 | 2;
  };

  const [typesRaw, assignRaw] = await Promise.all([
    frappeCall<RawType[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Shift Type",
        // `color` and `enable_auto_attendance` aren't in_list_view in
        // Frappe v15 → the REST endpoint refuses to project them. Detail page
        // pulls the full doc and gets them.
        fields: ["name", "start_time", "end_time"],
        order_by: "name asc",
        limit_page_length: 50,
      },
      as: "user",
    }).catch(() => [] as RawType[]),
    frappeCall<RawAssign[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Shift Assignment",
        fields: [
          "name",
          "employee",
          "employee_name",
          "shift_type",
          "start_date",
          "end_date",
          "status",
          "docstatus",
        ],
        filters: JSON.stringify([["status", "=", "Active"]]),
        order_by: "start_date desc",
        limit_page_length: 100,
      },
      as: "user",
    }).catch(() => [] as RawAssign[]),
  ]);

  const active = assignRaw.map<ShiftAssignment>((a) => ({
    id: a.name,
    employee: a.employee,
    employeeName: a.employee_name,
    shiftType: a.shift_type,
    startDate: a.start_date,
    endDate: a.end_date,
    status: a.status,
    docstatus: a.docstatus,
  }));

  const assignedCount = new Map<string, number>();
  for (const a of active) {
    assignedCount.set(a.shiftType, (assignedCount.get(a.shiftType) ?? 0) + 1);
  }

  const types = typesRaw.map<ShiftType>((t) => ({
    name: t.name,
    startTime: t.start_time,
    endTime: t.end_time,
    color: null,
    enableAutoAttendance: false,
    assignedCount: assignedCount.get(t.name) ?? 0,
  }));

  return { types, active };
}

// --- Shift Type ----------------------------------------------------------

export type ShiftTypeFull = {
  id: string;
  startTime: string | null;
  endTime: string | null;
  color: string | null;
  enableAutoAttendance: boolean;
  allowCheckOutAfterShiftEndTime: boolean;
  holidayList: string | null;
  workingHoursThresholdForHalfDay: number | null;
  workingHoursThresholdForAbsent: number | null;
  // Day-rate policy lives on Custom Fields we add to Shift Type. Each
  // multiplier defaults to a sane value if the field is null.
  regularDayMultiplier: number;
  saturdayDayMultiplier: number;
  sundayDayMultiplier: number;
  holidayDayMultiplier: number;
  /** Shift Location names linked via the `allowed_locations` child table. */
  allowedLocations: string[];
};

export async function getShiftType(id: string): Promise<ShiftTypeFull | null> {
  try {
    type Raw = {
      name: string;
      start_time: string | null;
      end_time: string | null;
      color: string | null;
      enable_auto_attendance: 0 | 1 | boolean | null;
      allow_check_out_after_shift_end_time: 0 | 1 | boolean | null;
      holiday_list: string | null;
      working_hours_threshold_for_half_day: number | null;
      working_hours_threshold_for_absent: number | null;
      // Custom-field additions for the day-rate policy.
      regular_day_multiplier?: number | null;
      saturday_day_multiplier?: number | null;
      sunday_day_multiplier?: number | null;
      holiday_day_multiplier?: number | null;
      allowed_locations?: Array<{ shift_location?: string | null }> | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Shift Type", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      startTime: doc.start_time,
      endTime: doc.end_time,
      color: doc.color,
      enableAutoAttendance: Boolean(doc.enable_auto_attendance),
      allowCheckOutAfterShiftEndTime: Boolean(
        doc.allow_check_out_after_shift_end_time,
      ),
      holidayList: doc.holiday_list,
      workingHoursThresholdForHalfDay: doc.working_hours_threshold_for_half_day,
      workingHoursThresholdForAbsent: doc.working_hours_threshold_for_absent,
      regularDayMultiplier: Number(doc.regular_day_multiplier ?? 1),
      saturdayDayMultiplier: Number(doc.saturday_day_multiplier ?? 1.5),
      sundayDayMultiplier: Number(doc.sunday_day_multiplier ?? 2),
      holidayDayMultiplier: Number(doc.holiday_day_multiplier ?? 2.5),
      allowedLocations: (doc.allowed_locations ?? [])
        .map((r) => r.shift_location)
        .filter((s): s is string => Boolean(s)),
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export type ShiftTypeInput = {
  name: string;
  start_time: string;
  end_time: string;
  color?: string;
  enable_auto_attendance?: boolean;
  allow_check_out_after_shift_end_time?: boolean;
  holiday_list?: string;
  working_hours_threshold_for_half_day?: number;
  working_hours_threshold_for_absent?: number;
  regular_day_multiplier?: number;
  saturday_day_multiplier?: number;
  sunday_day_multiplier?: number;
  holiday_day_multiplier?: number;
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

export async function createShiftType(input: ShiftTypeInput): Promise<string> {
  const doc = {
    doctype: "Shift Type",
    ...compact({
      name: input.name,
      start_time: ensureHms(input.start_time),
      end_time: ensureHms(input.end_time),
      color: input.color,
      enable_auto_attendance: input.enable_auto_attendance ? 1 : 0,
      allow_check_out_after_shift_end_time: input.allow_check_out_after_shift_end_time
        ? 1
        : 0,
      holiday_list: input.holiday_list,
      working_hours_threshold_for_half_day:
        input.working_hours_threshold_for_half_day,
      working_hours_threshold_for_absent:
        input.working_hours_threshold_for_absent,
      regular_day_multiplier: input.regular_day_multiplier,
      saturday_day_multiplier: input.saturday_day_multiplier,
      sunday_day_multiplier: input.sunday_day_multiplier,
      holiday_day_multiplier: input.holiday_day_multiplier,
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

export async function updateShiftType(
  id: string,
  input: Partial<ShiftTypeInput>,
): Promise<void> {
  const payload = compact({
    start_time: input.start_time ? ensureHms(input.start_time) : undefined,
    end_time: input.end_time ? ensureHms(input.end_time) : undefined,
    color: input.color,
    enable_auto_attendance:
      input.enable_auto_attendance === undefined
        ? undefined
        : input.enable_auto_attendance
          ? 1
          : 0,
    allow_check_out_after_shift_end_time:
      input.allow_check_out_after_shift_end_time === undefined
        ? undefined
        : input.allow_check_out_after_shift_end_time
          ? 1
          : 0,
    holiday_list: input.holiday_list,
    working_hours_threshold_for_half_day:
      input.working_hours_threshold_for_half_day,
    working_hours_threshold_for_absent:
      input.working_hours_threshold_for_absent,
    regular_day_multiplier: input.regular_day_multiplier,
    saturday_day_multiplier: input.saturday_day_multiplier,
    sunday_day_multiplier: input.sunday_day_multiplier,
    holiday_day_multiplier: input.holiday_day_multiplier,
  });
  await frappeCall<{ name: string }>({
    method: "frappe.client.set_value",
    args: { doctype: "Shift Type", name: id, fieldname: payload },
    verb: "POST",
    as: "user",
  });
}

function ensureHms(t: string): string {
  // <input type="time"> returns "HH:MM"; Frappe expects "HH:MM:SS".
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return t;
}

// --- Shift Assignment ----------------------------------------------------

export type ShiftAssignmentFull = ShiftAssignment & {
  company: string | null;
  department: string | null;
  shiftRequest: string | null;
};

export async function getShiftAssignment(
  id: string,
): Promise<ShiftAssignmentFull | null> {
  try {
    type Raw = {
      name: string;
      employee: string;
      employee_name: string | null;
      shift_type: string;
      start_date: string;
      end_date: string | null;
      status: string;
      docstatus: 0 | 1 | 2;
      company: string | null;
      department: string | null;
      shift_request: string | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Shift Assignment", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      employee: doc.employee,
      employeeName: doc.employee_name,
      shiftType: doc.shift_type,
      startDate: doc.start_date,
      endDate: doc.end_date,
      status: doc.status,
      docstatus: doc.docstatus,
      company: doc.company,
      department: doc.department,
      shiftRequest: doc.shift_request,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export type ShiftAssignmentInput = {
  employee: string;
  shift_type: string;
  start_date: string;
  end_date?: string;
  company?: string;
};

export async function createShiftAssignment(
  input: ShiftAssignmentInput,
): Promise<string> {
  const doc = {
    doctype: "Shift Assignment",
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

/** Cancels a submitted assignment. Frappe accepts {doctype, name}. */
export async function cancelShiftAssignment(id: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.cancel",
    args: { doctype: "Shift Assignment", name: id },
    verb: "POST",
    as: "user",
  });
}

export async function submitShiftAssignment(id: string): Promise<void> {
  const full = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Shift Assignment", name: id },
    as: "user",
  });
  await frappeCall<unknown>({
    method: "frappe.client.submit",
    args: { doc: full },
    verb: "POST",
    as: "user",
  });
}

/**
 * Replace the Shift Type's `allowed_locations` child table with the given
 * list of Shift Location names. Pass an empty list to clear.
 */
export async function setShiftTypeAllowedLocations(
  id: string,
  locations: string[],
): Promise<void> {
  await frappeCall<{ name: string }>({
    method: "frappe.client.set_value",
    args: {
      doctype: "Shift Type",
      name: id,
      fieldname: {
        allowed_locations: locations.map((loc) => ({
          doctype: "Shift Location Item",
          shift_location: loc,
        })),
      },
    },
    verb: "POST",
    as: "user",
  });
}

/**
 * Permanently delete a Shift Type. Frappe blocks delete when other documents
 * link to it (Shift Assignment, Employee.default_shift, …) — the error
 * bubbles back through `_server_messages` so we can show it inline.
 */
export async function deleteShiftType(id: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    args: { doctype: "Shift Type", name: id },
    verb: "POST",
    as: "user",
  });
}

/** Delete a draft assignment (docstatus 0). Submitted ones must be cancelled
 *  first via `cancelShiftAssignment`. */
export async function deleteShiftAssignment(id: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    args: { doctype: "Shift Assignment", name: id },
    verb: "POST",
    as: "user",
  });
}

/** Delete a draft shift request. */
export async function deleteShiftRequest(id: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    args: { doctype: "Shift Request", name: id },
    verb: "POST",
    as: "user",
  });
}

export async function listShiftAssignments(opts: {
  status?: string;
  employee?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: ShiftAssignment[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.status) filters.push(["status", "=", opts.status]);
  if (opts.employee) filters.push(["employee", "=", opts.employee]);

  type Raw = {
    name: string;
    employee: string;
    employee_name: string | null;
    shift_type: string;
    start_date: string;
    end_date: string | null;
    status: string;
    docstatus: 0 | 1 | 2;
  };

  const [rowsRaw, totalRaw] = await Promise.all([
    frappeCall<Raw[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Shift Assignment",
        fields: [
          "name",
          "employee",
          "employee_name",
          "shift_type",
          "start_date",
          "end_date",
          "status",
          "docstatus",
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
      args: { doctype: "Shift Assignment", filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      shiftType: r.shift_type,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
      docstatus: r.docstatus,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
  };
}

export const SHIFT_ASSIGNMENT_STATUSES = ["Active", "Inactive"];

// --- Shift Request -------------------------------------------------------

export type ShiftRequestRow = {
  id: string;
  employee: string;
  employeeName: string | null;
  shiftType: string;
  fromDate: string;
  toDate: string | null;
  status: string;
  approver: string | null;
  docstatus: 0 | 1 | 2;
};

export async function listShiftRequests(opts: {
  status?: string;
  employee?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: ShiftRequestRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: { draft: number; approved: number; rejected: number };
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.status) filters.push(["status", "=", opts.status]);
  if (opts.employee) filters.push(["employee", "=", opts.employee]);

  type Raw = {
    name: string;
    employee: string;
    employee_name: string | null;
    shift_type: string;
    from_date: string;
    to_date: string | null;
    status: string;
    approver: string | null;
    docstatus: 0 | 1 | 2;
  };

  const [rowsRaw, totalRaw, draftCount, approvedCount, rejectedCount] =
    await Promise.all([
      frappeCall<Raw[]>({
        method: "frappe.client.get_list",
        args: {
          doctype: "Shift Request",
          fields: [
            "name",
            "employee",
            "employee_name",
            "shift_type",
            "from_date",
            "to_date",
            "status",
            "approver",
            "docstatus",
          ],
          filters: JSON.stringify(filters),
          order_by: "from_date desc",
          limit_start: (page - 1) * pageSize,
          limit_page_length: pageSize,
        },
        as: "user",
      }).catch(() => [] as Raw[]),
      frappeCall<number>({
        method: "frappe.client.get_count",
        args: { doctype: "Shift Request", filters: JSON.stringify(filters) },
        as: "user",
      }).catch(() => 0),
      frappeCall<number>({
        method: "frappe.client.get_count",
        args: {
          doctype: "Shift Request",
          filters: JSON.stringify([["status", "=", "Draft"]]),
        },
        as: "user",
      }).catch(() => 0),
      frappeCall<number>({
        method: "frappe.client.get_count",
        args: {
          doctype: "Shift Request",
          filters: JSON.stringify([["status", "=", "Approved"]]),
        },
        as: "user",
      }).catch(() => 0),
      frappeCall<number>({
        method: "frappe.client.get_count",
        args: {
          doctype: "Shift Request",
          filters: JSON.stringify([["status", "=", "Rejected"]]),
        },
        as: "user",
      }).catch(() => 0),
    ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      shiftType: r.shift_type,
      fromDate: r.from_date,
      toDate: r.to_date,
      status: r.status,
      approver: r.approver,
      docstatus: r.docstatus,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
    counts: {
      draft: Number(draftCount ?? 0),
      approved: Number(approvedCount ?? 0),
      rejected: Number(rejectedCount ?? 0),
    },
  };
}

export type ShiftRequestFull = ShiftRequestRow & {
  approver: string | null;
  approverName: string | null;
  company: string | null;
  department: string | null;
};

export async function getShiftRequest(
  id: string,
): Promise<ShiftRequestFull | null> {
  try {
    type Raw = {
      name: string;
      employee: string;
      employee_name: string | null;
      shift_type: string;
      from_date: string;
      to_date: string | null;
      status: string;
      approver: string | null;
      approver_name: string | null;
      company: string | null;
      department: string | null;
      docstatus: 0 | 1 | 2;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Shift Request", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      employee: doc.employee,
      employeeName: doc.employee_name,
      shiftType: doc.shift_type,
      fromDate: doc.from_date,
      toDate: doc.to_date,
      status: doc.status,
      approver: doc.approver,
      approverName: doc.approver_name,
      company: doc.company,
      department: doc.department,
      docstatus: doc.docstatus,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export type ShiftRequestInput = {
  employee: string;
  shift_type: string;
  from_date: string;
  to_date?: string;
  approver?: string;
};

export async function createShiftRequest(
  input: ShiftRequestInput,
): Promise<string> {
  const doc = {
    doctype: "Shift Request",
    status: "Draft",
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

export async function decideShiftRequest(
  id: string,
  decision: "Approved" | "Rejected",
): Promise<void> {
  const full = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Shift Request", name: id },
    as: "user",
  });
  full.status = decision;
  await frappeCall<unknown>({
    method: "frappe.client.submit",
    args: { doc: full },
    verb: "POST",
    as: "user",
  });
}

export const SHIFT_REQUEST_STATUSES = ["Draft", "Approved", "Rejected"];
