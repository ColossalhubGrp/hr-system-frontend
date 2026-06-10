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
