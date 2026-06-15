import "server-only";
import { FrappeRequestError, frappeCall } from "./client";

export type AppraisalRow = {
  id: string;
  employee: string;
  employeeName: string | null;
  cycle: string | null;
  status: string;
  finalScore: number | null;
  appraisalTemplate: string | null;
  docstatus: 0 | 1 | 2;
};

export type GoalRow = {
  id: string;
  employee: string | null;
  employeeName: string | null;
  goalName: string;
  status: string;
  progress: number | null;
  startDate: string | null;
  endDate: string | null;
};

export async function listAppraisals(opts: {
  status?: string;
  cycle?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: AppraisalRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: { draft: number; submitted: number; cancelled: number };
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.status) filters.push(["status", "=", opts.status]);
  if (opts.cycle) filters.push(["appraisal_cycle", "=", opts.cycle]);

  type Row = {
    name: string;
    employee: string;
    employee_name: string | null;
    appraisal_cycle: string | null;
    status: string;
    final_score: number | null;
    appraisal_template: string | null;
    docstatus: 0 | 1 | 2;
  };

  const [rowsRaw, totalRaw, drafts, submits, cancels] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Appraisal",
        fields: [
          "name",
          "employee",
          "employee_name",
          "appraisal_cycle",
          "status",
          "final_score",
          "appraisal_template",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "modified desc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype: "Appraisal", filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Appraisal",
        filters: JSON.stringify([["docstatus", "=", 0]]),
      },
      as: "user",
    }).catch(() => 0),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Appraisal",
        filters: JSON.stringify([["docstatus", "=", 1]]),
      },
      as: "user",
    }).catch(() => 0),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Appraisal",
        filters: JSON.stringify([["docstatus", "=", 2]]),
      },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      cycle: r.appraisal_cycle,
      status: r.status,
      finalScore: r.final_score === null ? null : Number(r.final_score),
      appraisalTemplate: r.appraisal_template,
      docstatus: r.docstatus,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
    counts: {
      draft: Number(drafts ?? 0),
      submitted: Number(submits ?? 0),
      cancelled: Number(cancels ?? 0),
    },
  };
}

export async function listGoals(opts: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: GoalRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.status) filters.push(["status", "=", opts.status]);

  type Row = {
    name: string;
    employee: string | null;
    employee_name: string | null;
    // Frappe v15 rejects `goal_name` in list projections — only `goal` (the
    // short label) is in_list_view. We seed both to the same value, and fall
    // back to `name` for legacy rows without a `goal` set.
    goal: string | null;
    status: string;
    progress: number | null;
    start_date: string | null;
    end_date: string | null;
  };

  const [rowsRaw, totalRaw] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Goal",
        fields: [
          "name",
          "employee",
          "employee_name",
          "goal",
          "status",
          "progress",
          "start_date",
          "end_date",
        ],
        filters: JSON.stringify(filters),
        order_by: "modified desc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype: "Goal", filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      goalName: r.goal ?? r.name,
      status: r.status,
      progress: r.progress === null ? null : Number(r.progress),
      startDate: r.start_date,
      endDate: r.end_date,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
  };
}

export async function listAppraisalCycles(): Promise<string[]> {
  try {
    const rows = await frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Appraisal Cycle",
        fields: ["name"],
        order_by: "name desc",
        limit_page_length: 30,
      },
      as: "user",
    });
    return rows.map((r) => r.name).filter(Boolean);
  } catch {
    return [];
  }
}

export const APPRAISAL_STATUSES = [
  "Draft",
  "Apply",
  "Self Appraisal",
  "Completed",
];
export const GOAL_STATUSES = [
  "In Progress",
  "Completed",
  "Pending",
  "Closed",
  "Archived",
];

// --- Employee Feedback -----------------------------------------------------

export type FeedbackRow = {
  id: string;
  employee: string;
  employeeName: string | null;
  reviewer: string | null;
  reviewerName: string | null;
  feedbackDate: string | null;
  totalScore: number | null;
  appraisalCycle: string | null;
  docstatus: 0 | 1 | 2;
};

export async function listFeedback(opts: {
  cycle?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: FeedbackRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.cycle) filters.push(["appraisal_cycle", "=", opts.cycle]);

  type Row = {
    name: string;
    employee: string;
    employee_name: string | null;
    reviewer: string | null;
    reviewer_name: string | null;
    // Frappe v15 rejects `feedback_date` in list projections — substitute the
    // standard `modified` timestamp so the "When" column still has signal.
    modified: string | null;
    total_score: number | null;
    appraisal_cycle: string | null;
    docstatus: 0 | 1 | 2;
  };

  const [rowsRaw, totalRaw] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee Performance Feedback",
        fields: [
          "name",
          "employee",
          "employee_name",
          "reviewer",
          "reviewer_name",
          "modified",
          "total_score",
          "appraisal_cycle",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "modified desc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Employee Performance Feedback",
        filters: JSON.stringify(filters),
      },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      reviewer: r.reviewer,
      reviewerName: r.reviewer_name,
      feedbackDate: r.modified ? r.modified.slice(0, 10) : null,
      totalScore: r.total_score === null ? null : Number(r.total_score),
      appraisalCycle: r.appraisal_cycle,
      docstatus: r.docstatus,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
  };
}

// --- Performance Improvement Plan ------------------------------------------

export type PipRow = {
  id: string;
  employee: string;
  employeeName: string | null;
  fromDate: string | null;
  toDate: string | null;
  status: string;
  appraisalCycle: string | null;
  docstatus: 0 | 1 | 2;
};

export async function listPips(opts: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: PipRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const filters: Array<[string, string, string]> = [];
  if (opts.status) filters.push(["status", "=", opts.status]);

  type Row = {
    name: string;
    employee: string;
    employee_name: string | null;
    // Frappe v15 rejects `from_date` / `to_date` in PIP list projections —
    // the detail page (frappe.client.get) still surfaces them. Window cell
    // on the list view falls back to `modified`.
    modified: string | null;
    status: string;
    appraisal_cycle: string | null;
    docstatus: 0 | 1 | 2;
  };

  const [rowsRaw, totalRaw] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Performance Improvement Plan",
        fields: [
          "name",
          "employee",
          "employee_name",
          "modified",
          "status",
          "appraisal_cycle",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "modified desc",
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Performance Improvement Plan",
        filters: JSON.stringify(filters),
      },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    rows: rowsRaw.map((r) => ({
      id: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      // List can't pull from_date/to_date — fall back to the modified day
      // for the "Window" column. The detail page still shows the real dates.
      fromDate: r.modified ? r.modified.slice(0, 10) : null,
      toDate: null,
      status: r.status,
      appraisalCycle: r.appraisal_cycle,
      docstatus: r.docstatus,
    })),
    total: Number(totalRaw ?? 0),
    page,
    pageSize,
  };
}

export const PIP_STATUSES = ["Open", "Completed", "Cancelled"];

// --- single docs + writes -------------------------------------------------

function compact<T extends Record<string, unknown>>(
  o: T,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

// Goal --------------------------------------------------------------------

export type BscPerspective =
  | "Financial"
  | "Customer"
  | "Internal Process"
  | "Learning & Growth";

export const BSC_PERSPECTIVES: BscPerspective[] = [
  "Financial",
  "Customer",
  "Internal Process",
  "Learning & Growth",
];

export type GoalFull = {
  id: string;
  goalName: string;
  description: string | null;
  employee: string | null;
  employeeName: string | null;
  status: string;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  appraisalCycle: string | null;
  kra: string | null;
  /** BSC mode only — which Balanced Scorecard perspective this goal sits in. */
  perspective: BscPerspective | null;
};

export async function getGoal(id: string): Promise<GoalFull | null> {
  try {
    type Raw = {
      name: string;
      // The Frappe field is `goal` (short title, Data, required) — not
      // `goal_name`. Pre-existing bug fixed as part of the goals-first flow.
      goal: string | null;
      description: string | null;
      employee: string | null;
      employee_name: string | null;
      status: string;
      progress: number | null;
      start_date: string | null;
      end_date: string | null;
      appraisal_cycle: string | null;
      kra: string | null;
      perspective: string | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Goal", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      goalName: doc.goal ?? doc.name,
      description: doc.description,
      employee: doc.employee,
      employeeName: doc.employee_name,
      status: doc.status,
      progress: Number(doc.progress ?? 0),
      startDate: doc.start_date,
      endDate: doc.end_date,
      appraisalCycle: doc.appraisal_cycle,
      kra: doc.kra,
      perspective: isPerspective(doc.perspective) ? doc.perspective : null,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

function isPerspective(v: string | null | undefined): v is BscPerspective {
  return (
    v === "Financial" ||
    v === "Customer" ||
    v === "Internal Process" ||
    v === "Learning & Growth"
  );
}

/**
 * GoalInput uses `goal_name` for ergonomics (the form sends a field called
 * `goal_name`), but the underlying Frappe field is `goal` — see field meta.
 * `createGoal` translates the alias when building the insert payload.
 */
export type GoalInput = {
  goal_name: string;
  description?: string;
  employee?: string;
  status?: string;
  progress?: number;
  start_date?: string;
  end_date?: string;
  appraisal_cycle?: string;
  kra?: string;
  perspective?: string;
};

export async function createGoal(input: GoalInput): Promise<string> {
  const { goal_name, ...rest } = input;
  const doc = {
    doctype: "Goal",
    status: "In Progress",
    progress: 0,
    // Frappe's required field is `goal` — map our ergonomic `goal_name` onto it.
    goal: goal_name,
    ...compact(rest),
  };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

export async function updateGoal(
  id: string,
  input: Partial<GoalInput>,
): Promise<void> {
  // Same alias mapping as createGoal — Frappe's required title field is `goal`.
  const { goal_name, ...rest } = input;
  const payload = {
    ...(goal_name !== undefined ? { goal: goal_name } : {}),
    ...compact(rest),
  };
  await frappeCall<{ name: string }>({
    method: "frappe.client.set_value",
    args: { doctype: "Goal", name: id, fieldname: payload },
    verb: "POST",
    as: "user",
  });
}

// Appraisal ---------------------------------------------------------------

export type AppraisalFull = {
  id: string;
  employee: string;
  employeeName: string | null;
  appraisalCycle: string | null;
  appraisalTemplate: string | null;
  status: string;
  selfScore: number | null;
  averageFeedbackScore: number | null;
  goalScore: number | null;
  finalScore: number | null;
  rating: number | null;
  startDate: string | null;
  endDate: string | null;
  reviewer: string | null;
  reviewerName: string | null;
  docstatus: 0 | 1 | 2;
};

export async function getAppraisal(id: string): Promise<AppraisalFull | null> {
  try {
    type Raw = {
      name: string;
      employee: string;
      employee_name: string | null;
      appraisal_cycle: string | null;
      appraisal_template: string | null;
      status: string;
      self_score: number | null;
      avg_feedback_score: number | null;
      goal_score: number | null;
      final_score: number | null;
      rating: number | null;
      start_date: string | null;
      end_date: string | null;
      reviewer: string | null;
      reviewer_name: string | null;
      docstatus: 0 | 1 | 2;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Appraisal", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      employee: doc.employee,
      employeeName: doc.employee_name,
      appraisalCycle: doc.appraisal_cycle,
      appraisalTemplate: doc.appraisal_template,
      status: doc.status,
      selfScore: doc.self_score,
      averageFeedbackScore: doc.avg_feedback_score,
      goalScore: doc.goal_score,
      finalScore: doc.final_score,
      rating: doc.rating,
      startDate: doc.start_date,
      endDate: doc.end_date,
      reviewer: doc.reviewer,
      reviewerName: doc.reviewer_name,
      docstatus: doc.docstatus,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export type AppraisalInput = {
  employee: string;
  appraisal_cycle?: string;
  appraisal_template?: string;
  start_date?: string;
  end_date?: string;
  reviewer?: string;
};

export async function createAppraisal(input: AppraisalInput): Promise<string> {
  const doc = {
    doctype: "Appraisal",
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

export async function submitAppraisal(id: string): Promise<void> {
  const full = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Appraisal", name: id },
    as: "user",
  });
  await frappeCall<unknown>({
    method: "frappe.client.submit",
    args: { doc: full },
    verb: "POST",
    as: "user",
  });
}

export async function cancelAppraisal(id: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.cancel",
    args: { doctype: "Appraisal", name: id },
    verb: "POST",
    as: "user",
  });
}

// Employee Performance Feedback -------------------------------------------

export type FeedbackFull = {
  id: string;
  employee: string;
  employeeName: string | null;
  reviewer: string | null;
  reviewerName: string | null;
  feedbackDate: string | null;
  totalScore: number | null;
  appraisalCycle: string | null;
  feedback: string | null;
  docstatus: 0 | 1 | 2;
};

export async function getFeedback(id: string): Promise<FeedbackFull | null> {
  try {
    type Raw = {
      name: string;
      employee: string;
      employee_name: string | null;
      reviewer: string | null;
      reviewer_name: string | null;
      feedback_date: string | null;
      total_score: number | null;
      appraisal_cycle: string | null;
      feedback: string | null;
      docstatus: 0 | 1 | 2;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Employee Performance Feedback", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      employee: doc.employee,
      employeeName: doc.employee_name,
      reviewer: doc.reviewer,
      reviewerName: doc.reviewer_name,
      feedbackDate: doc.feedback_date,
      totalScore: doc.total_score,
      appraisalCycle: doc.appraisal_cycle,
      feedback: doc.feedback,
      docstatus: doc.docstatus,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export type FeedbackInput = {
  employee: string;
  reviewer: string;
  feedback: string;
  appraisal_cycle?: string;
  feedback_date?: string;
};

export async function createFeedback(input: FeedbackInput): Promise<string> {
  const doc = {
    doctype: "Employee Performance Feedback",
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

export async function submitFeedback(id: string): Promise<void> {
  const full = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Employee Performance Feedback", name: id },
    as: "user",
  });
  await frappeCall<unknown>({
    method: "frappe.client.submit",
    args: { doc: full },
    verb: "POST",
    as: "user",
  });
}

// Performance Improvement Plan --------------------------------------------

export type PipFull = {
  id: string;
  employee: string;
  employeeName: string | null;
  fromDate: string | null;
  toDate: string | null;
  status: string;
  appraisalCycle: string | null;
  reviewer: string | null;
  reasonForPip: string | null;
  improvementPlan: string | null;
  docstatus: 0 | 1 | 2;
};

export async function getPip(id: string): Promise<PipFull | null> {
  try {
    type Raw = {
      name: string;
      employee: string;
      employee_name: string | null;
      from_date: string | null;
      to_date: string | null;
      status: string;
      appraisal_cycle: string | null;
      reviewer: string | null;
      reason_for_pip: string | null;
      improvement_plan: string | null;
      docstatus: 0 | 1 | 2;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Performance Improvement Plan", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      employee: doc.employee,
      employeeName: doc.employee_name,
      fromDate: doc.from_date,
      toDate: doc.to_date,
      status: doc.status,
      appraisalCycle: doc.appraisal_cycle,
      reviewer: doc.reviewer,
      reasonForPip: doc.reason_for_pip,
      improvementPlan: doc.improvement_plan,
      docstatus: doc.docstatus,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

export type PipInput = {
  employee: string;
  from_date: string;
  to_date: string;
  reviewer?: string;
  appraisal_cycle?: string;
  reason_for_pip?: string;
  improvement_plan?: string;
};

export async function createPip(input: PipInput): Promise<string> {
  const doc = {
    doctype: "Performance Improvement Plan",
    status: "Open",
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

// Appraisal Cycle ---------------------------------------------------------

/**
 * A goal that can be picked into a cycle. The cycle-creation form lists
 * every existing standalone Goal so HR can select which ones the cycle
 * formally tracks.
 */
export type SelectableGoal = {
  id: string;
  goalName: string;
  employee: string | null;
  employeeName: string | null;
  status: string;
  progress: number;
};

/**
 * Lists Goals that are candidates for the "Select goals" step of a new
 * Appraisal Cycle. By default surfaces only goals NOT yet attached to any
 * cycle (`appraisal_cycle is null`) — the new flow encourages standalone
 * goals — but takes `includeAttached: true` to show everything when editing
 * an existing cycle that may already include some.
 */
export async function listSelectableGoals(opts?: {
  includeAttached?: boolean;
  limit?: number;
}): Promise<SelectableGoal[]> {
  const limit = Math.min(500, Math.max(20, opts?.limit ?? 200));
  // Status filter: exclude Archived/Closed goals. Frappe's "in"/"not in"
  // operator wants the value as a comma-string OR a list — we send the
  // list for safety.
  const filters: Array<[string, string, string[] | string | null]> = [
    ["status", "not in", ["Archived", "Closed"]],
  ];
  type Row = {
    name: string;
    goal: string | null;
    employee: string | null;
    employee_name: string | null;
    status: string;
    progress: number | null;
  };
  // Two parallel reads:
  //   - Every candidate goal (status filter applied).
  //   - Every goal id ALREADY referenced in any cycle's `selected_goals` child
  //     table. The child rows are queryable as their own doctype.
  const [rows, attachedRows] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Goal",
        fields: ["name", "goal", "employee", "employee_name", "status", "progress"],
        filters: JSON.stringify(filters),
        order_by: "modified desc",
        limit_page_length: limit,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    opts?.includeAttached
      ? Promise.resolve({ goals: [] as string[] })
      : frappeCall<{ goals: string[] }>({
          method: "recruitment_app.api.me.goals_attached_to_cycles",
          as: "user",
        }).catch(() => ({ goals: [] as string[] })),
  ]);
  const attached = new Set(
    (Array.isArray(attachedRows)
      ? (attachedRows as Array<{ goal: string }>).map((r) => r.goal)
      : (attachedRows as { goals: string[] }).goals
    ).filter(Boolean),
  );
  const filtered = opts?.includeAttached
    ? rows
    : rows.filter((r) => !attached.has(r.name));
  return filtered.map((r) => ({
    id: r.name,
    goalName: r.goal ?? r.name,
    employee: r.employee,
    employeeName: r.employee_name,
    status: r.status,
    progress: Number(r.progress ?? 0),
  }));
}

/** Rows in the new `selected_goals` child table on Appraisal Cycle. */
export type SelectedGoalRow = {
  goal: string;
  /** Optional 0–100 weighting; defaults to 0 (no weighting). */
  weight?: number;
};

export type CycleInput = {
  cycle_name: string;
  start_date: string;
  end_date: string;
  company?: string;
  kra_evaluation_method?: "Manual Rating" | "Automated Based on Goal Progress";
  evaluation_framework?: "KRA & Goals" | "OKR" | "Balanced Scorecard";
  /** Goals chosen into the cycle. Rendered as the `selected_goals` child
   *  table on the Appraisal Cycle doc. */
  selected_goals?: SelectedGoalRow[];
};

export async function createAppraisalCycle(input: CycleInput): Promise<string> {
  // The child table accepts a list of row objects in Frappe REST inserts.
  // `compact()` would drop the array if empty, which is what we want
  // (no key = no child rows = nothing to write).
  const { selected_goals, ...scalar } = input;
  const doc: Record<string, unknown> = {
    doctype: "Appraisal Cycle",
    ...compact(scalar),
  };
  if (selected_goals && selected_goals.length > 0) {
    doc.selected_goals = selected_goals.map((r) => ({
      goal: r.goal,
      ...(r.weight !== undefined ? { weight: r.weight } : {}),
    }));
  }
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

/**
 * Read the full Appraisal Cycle including its `selected_goals` child table.
 * Used by the cycle-detail view to render which goals were rolled into the
 * cycle and to support add/remove later.
 */
export type CycleFull = {
  id: string;
  cycleName: string;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  company: string | null;
  evaluationFramework: string | null;
  selectedGoals: Array<{
    goal: string;
    goalName: string | null;
    employee: string | null;
    weight: number;
  }>;
};

export async function getAppraisalCycle(id: string): Promise<CycleFull | null> {
  try {
    type Raw = {
      name: string;
      cycle_name: string;
      start_date: string | null;
      end_date: string | null;
      status: string | null;
      company: string | null;
      evaluation_framework: string | null;
      selected_goals?: Array<{
        goal: string;
        goal_name?: string | null;
        employee?: string | null;
        weight?: number | null;
      }>;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Appraisal Cycle", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      cycleName: doc.cycle_name,
      startDate: doc.start_date,
      endDate: doc.end_date,
      status: doc.status,
      company: doc.company,
      evaluationFramework: doc.evaluation_framework,
      selectedGoals: (doc.selected_goals ?? []).map((r) => ({
        goal: r.goal,
        goalName: r.goal_name ?? null,
        employee: r.employee ?? null,
        weight: Number(r.weight ?? 0),
      })),
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Replace the `selected_goals` child rows on an existing cycle. Used by the
 * cycle-detail page when HR adds/removes goals after the cycle was created.
 * Frappe's `frappe.client.set_value` can't update child tables, so we fetch
 * the full doc, swap the array, and update via `set_value` on the row keys
 * is fragile — instead we use the proper update flow.
 */
export async function setCycleSelectedGoals(
  cycleId: string,
  rows: SelectedGoalRow[],
): Promise<void> {
  // Fetch, mutate, save — the standard pattern for child-table writes.
  const doc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    args: { doctype: "Appraisal Cycle", name: cycleId },
    as: "user",
  });
  doc.selected_goals = rows.map((r) => ({
    goal: r.goal,
    ...(r.weight !== undefined ? { weight: r.weight } : {}),
  }));
  await frappeCall<unknown>({
    method: "frappe.client.set_value",
    verb: "POST",
    args: {
      doctype: "Appraisal Cycle",
      name: cycleId,
      fieldname: "selected_goals",
      value: doc.selected_goals,
    },
    as: "user",
  }).catch(async () => {
    // Some Frappe versions don't accept child tables via set_value — fall
    // back to a full doc save.
    await frappeCall<unknown>({
      method: "frappe.client.save",
      verb: "POST",
      args: { doc },
      as: "user",
    });
  });
}

// Appraisal Template ------------------------------------------------------

export type TemplateInput = {
  template_title: string;
  description?: string;
};

export async function createAppraisalTemplate(
  input: TemplateInput,
): Promise<string> {
  const doc = {
    doctype: "Appraisal Template",
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
