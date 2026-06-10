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
};

export async function getGoal(id: string): Promise<GoalFull | null> {
  try {
    type Raw = {
      name: string;
      goal_name: string;
      description: string | null;
      employee: string | null;
      employee_name: string | null;
      status: string;
      progress: number | null;
      start_date: string | null;
      end_date: string | null;
      appraisal_cycle: string | null;
      kra: string | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Goal", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      goalName: doc.goal_name,
      description: doc.description,
      employee: doc.employee,
      employeeName: doc.employee_name,
      status: doc.status,
      progress: Number(doc.progress ?? 0),
      startDate: doc.start_date,
      endDate: doc.end_date,
      appraisalCycle: doc.appraisal_cycle,
      kra: doc.kra,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    throw err;
  }
}

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
};

export async function createGoal(input: GoalInput): Promise<string> {
  const doc = {
    doctype: "Goal",
    status: "In Progress",
    progress: 0,
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

export async function updateGoal(
  id: string,
  input: Partial<GoalInput>,
): Promise<void> {
  await frappeCall<{ name: string }>({
    method: "frappe.client.set_value",
    args: { doctype: "Goal", name: id, fieldname: compact(input) },
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

export type CycleInput = {
  cycle_name: string;
  start_date: string;
  end_date: string;
  company?: string;
  kra_evaluation_method?: "Manual" | "Automated";
};

export async function createAppraisalCycle(input: CycleInput): Promise<string> {
  const doc = {
    doctype: "Appraisal Cycle",
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
