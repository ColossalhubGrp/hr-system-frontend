import "server-only";
import { frappeCall, FrappeRequestError } from "./client";

// ============================================================================
// Shared submit / cancel through the admin whitelist
// ============================================================================

export type SubmittableDoctype =
  | "Employee Advance"
  | "Travel Request"
  | "Training Result"
  | "Training Feedback";

export async function submitAdminDoc(
  doctype: SubmittableDoctype,
  name: string,
): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_submit_generic",
    verb: "POST",
    args: { doctype, name },
    as: "user",
  });
}

export async function cancelAdminDoc(
  doctype: SubmittableDoctype,
  name: string,
): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_cancel_generic",
    verb: "POST",
    args: { doctype, name },
    as: "user",
  });
}

// ============================================================================
// Employee Advance
// ============================================================================

export type EmployeeAdvanceRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  purpose: string | null;
  advanceAmount: number;
  paidAmount: number;
  claimedAmount: number;
  returnAmount: number;
  currency: string | null;
  status: string;
  postingDate: string;
  docstatus: 0 | 1 | 2;
};

export async function listEmployeeAdvances(opts?: {
  employee?: string;
  status?: string;
}): Promise<EmployeeAdvanceRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.employee) filters.push(["employee", "=", opts.employee]);
  if (opts?.status) filters.push(["status", "=", opts.status]);
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      purpose: string | null;
      advance_amount: number | null;
      paid_amount: number | null;
      claimed_amount: number | null;
      return_amount: number | null;
      currency: string | null;
      status: string;
      posting_date: string;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee Advance",
        fields: [
          "name",
          "employee",
          "employee_name",
          "purpose",
          "advance_amount",
          "paid_amount",
          "claimed_amount",
          "return_amount",
          "currency",
          "status",
          "posting_date",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "posting_date desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      purpose: r.purpose,
      advanceAmount: Number(r.advance_amount ?? 0),
      paidAmount: Number(r.paid_amount ?? 0),
      claimedAmount: Number(r.claimed_amount ?? 0),
      returnAmount: Number(r.return_amount ?? 0),
      currency: r.currency,
      status: r.status,
      postingDate: r.posting_date,
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export type EmployeeAdvanceFull = EmployeeAdvanceRow & {
  modeOfPayment: string | null;
  advanceAccount: string | null;
  exchangeRate: number;
};

export async function getEmployeeAdvance(
  name: string,
): Promise<EmployeeAdvanceFull | null> {
  try {
    type Raw = {
      name: string;
      docstatus: 0 | 1 | 2;
      employee: string;
      employee_name: string | null;
      purpose: string | null;
      advance_amount: number | null;
      paid_amount: number | null;
      claimed_amount: number | null;
      return_amount: number | null;
      currency: string | null;
      exchange_rate: number | null;
      status: string;
      posting_date: string;
      mode_of_payment: string | null;
      advance_account: string | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Employee Advance", name },
      as: "user",
    });
    return {
      name: doc.name,
      docstatus: doc.docstatus,
      employee: doc.employee,
      employeeName: doc.employee_name,
      purpose: doc.purpose,
      advanceAmount: Number(doc.advance_amount ?? 0),
      paidAmount: Number(doc.paid_amount ?? 0),
      claimedAmount: Number(doc.claimed_amount ?? 0),
      returnAmount: Number(doc.return_amount ?? 0),
      currency: doc.currency,
      exchangeRate: Number(doc.exchange_rate ?? 1),
      status: doc.status,
      postingDate: doc.posting_date,
      modeOfPayment: doc.mode_of_payment,
      advanceAccount: doc.advance_account,
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    return null;
  }
}

export async function createEmployeeAdvance(input: {
  employee: string;
  purpose: string;
  advanceAmount: number;
  currency?: string;
  exchangeRate?: number;
  postingDate: string;
  modeOfPayment?: string;
  advanceAccount?: string;
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Employee Advance",
        employee: input.employee,
        purpose: input.purpose,
        advance_amount: input.advanceAmount,
        posting_date: input.postingDate,
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.exchangeRate ? { exchange_rate: input.exchangeRate } : {}),
        ...(input.modeOfPayment ? { mode_of_payment: input.modeOfPayment } : {}),
        ...(input.advanceAccount ? { advance_account: input.advanceAccount } : {}),
      },
    },
    as: "user",
  });
  return saved.name;
}

// ============================================================================
// Travel Request
// ============================================================================

export type TravelRequestRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  travelType: string | null;
  travelFunding: string | null;
  fromDate: string | null;
  toDate: string | null;
  purposeOfTravel: string | null;
  status: string;
  docstatus: 0 | 1 | 2;
};

export async function listTravelRequests(opts?: {
  employee?: string;
  status?: string;
}): Promise<TravelRequestRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.employee) filters.push(["employee", "=", opts.employee]);
  if (opts?.status) filters.push(["status", "=", opts.status]);
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      travel_type: string | null;
      travel_funding: string | null;
      from_date: string | null;
      to_date: string | null;
      purpose_of_travel: string | null;
      status: string;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Travel Request",
        fields: [
          "name",
          "employee",
          "employee_name",
          "travel_type",
          "travel_funding",
          "from_date",
          "to_date",
          "purpose_of_travel",
          "status",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "from_date desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      travelType: r.travel_type,
      travelFunding: r.travel_funding,
      fromDate: r.from_date,
      toDate: r.to_date,
      purposeOfTravel: r.purpose_of_travel,
      status: r.status,
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export type TravelRequestFull = TravelRequestRow & {
  travelAdvanceRequired: boolean;
  costings: Array<{
    expense_type: string;
    amount: number;
    currency: string | null;
    funded_amount: number | null;
  }>;
  itinerary: Array<{
    departure_date: string | null;
    from_location: string | null;
    to_location: string | null;
    mode_of_transport: string | null;
    cost: number | null;
  }>;
};

export async function getTravelRequest(
  name: string,
): Promise<TravelRequestFull | null> {
  try {
    type Raw = {
      name: string;
      docstatus: 0 | 1 | 2;
      employee: string;
      employee_name: string | null;
      travel_type: string | null;
      travel_funding: string | null;
      from_date: string | null;
      to_date: string | null;
      purpose_of_travel: string | null;
      status: string;
      travel_advance_required: 0 | 1 | null;
      costings?: Array<{
        expense_type: string;
        amount: number | null;
        currency: string | null;
        funded_amount: number | null;
      }> | null;
      itinerary?: Array<{
        departure_date: string | null;
        from_location: string | null;
        to_location: string | null;
        mode_of_transport: string | null;
        cost: number | null;
      }> | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Travel Request", name },
      as: "user",
    });
    return {
      name: doc.name,
      docstatus: doc.docstatus,
      employee: doc.employee,
      employeeName: doc.employee_name,
      travelType: doc.travel_type,
      travelFunding: doc.travel_funding,
      fromDate: doc.from_date,
      toDate: doc.to_date,
      purposeOfTravel: doc.purpose_of_travel,
      status: doc.status,
      travelAdvanceRequired: Boolean(doc.travel_advance_required),
      costings: (doc.costings ?? []).map((c) => ({
        expense_type: c.expense_type,
        amount: Number(c.amount ?? 0),
        currency: c.currency,
        funded_amount: c.funded_amount === null ? null : Number(c.funded_amount),
      })),
      itinerary: (doc.itinerary ?? []).map((r) => ({
        departure_date: r.departure_date,
        from_location: r.from_location,
        to_location: r.to_location,
        mode_of_transport: r.mode_of_transport,
        cost: r.cost === null ? null : Number(r.cost),
      })),
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    return null;
  }
}

export type TravelCosting = {
  expense_type: string;
  amount: number;
  currency?: string;
  funded_amount?: number;
};
export type TravelItineraryRow = {
  departure_date: string;
  from_location: string;
  to_location: string;
  mode_of_transport?: string;
  cost?: number;
};

export async function createTravelRequest(input: {
  employee: string;
  travelType: "Domestic" | "International";
  travelFunding:
    | "Fully Sponsored"
    | "Partially Sponsored"
    | "Fully Sponsored by Employee";
  fromDate: string;
  toDate: string;
  purposeOfTravel: string;
  travelAdvanceRequired?: boolean;
  costings: TravelCosting[];
  itinerary: TravelItineraryRow[];
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Travel Request",
        employee: input.employee,
        travel_type: input.travelType,
        travel_funding: input.travelFunding,
        from_date: input.fromDate,
        to_date: input.toDate,
        purpose_of_travel: input.purposeOfTravel,
        travel_advance_required: input.travelAdvanceRequired ? 1 : 0,
        costings: input.costings.map((c) => ({
          doctype: "Travel Request Costing",
          ...c,
        })),
        itinerary: input.itinerary.map((r) => ({
          doctype: "Travel Itinerary",
          ...r,
        })),
      },
    },
    as: "user",
  });
  return saved.name;
}

// ============================================================================
// Training Result
// ============================================================================

export type TrainingResultRow = {
  name: string;
  trainingEvent: string;
  docstatus: 0 | 1 | 2;
};

export async function listTrainingResults(opts?: {
  trainingEvent?: string;
}): Promise<TrainingResultRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.trainingEvent)
    filters.push(["training_event", "=", opts.trainingEvent]);
  try {
    type R = {
      name: string;
      training_event: string;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Training Result",
        fields: ["name", "training_event", "docstatus"],
        filters: JSON.stringify(filters),
        order_by: "creation desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      trainingEvent: r.training_event,
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export type TrainingResultEmployeeRow = {
  employee: string;
  hours?: number;
  grade?: string;
  comments?: string;
};

export async function createTrainingResult(input: {
  trainingEvent: string;
  employees: TrainingResultEmployeeRow[];
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Training Result",
        training_event: input.trainingEvent,
        employees: input.employees.map((e) => ({
          doctype: "Training Result Employee",
          ...e,
        })),
      },
    },
    as: "user",
  });
  return saved.name;
}

// ============================================================================
// Training Feedback
// ============================================================================

export type TrainingFeedbackRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  trainingEvent: string;
  feedback: string | null;
  rating: number | null;
  docstatus: 0 | 1 | 2;
};

export async function listTrainingFeedback(opts?: {
  trainingEvent?: string;
  employee?: string;
}): Promise<TrainingFeedbackRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.trainingEvent)
    filters.push(["training_event", "=", opts.trainingEvent]);
  if (opts?.employee) filters.push(["employee", "=", opts.employee]);
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      training_event: string;
      feedback: string | null;
      rating: number | null;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Training Feedback",
        fields: [
          "name",
          "employee",
          "employee_name",
          "training_event",
          "feedback",
          "rating",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "creation desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      trainingEvent: r.training_event,
      feedback: r.feedback,
      rating: r.rating === null ? null : Number(r.rating),
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export async function createTrainingFeedback(input: {
  employee: string;
  trainingEvent: string;
  feedback: string;
  rating?: number;
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Training Feedback",
        employee: input.employee,
        training_event: input.trainingEvent,
        feedback: input.feedback,
        ...(input.rating ? { rating: input.rating } : {}),
      },
    },
    as: "user",
  });
  return saved.name;
}

// ============================================================================
// Appraisal Cycle — appraisees + Create Appraisals
// ============================================================================

export type AppraiseeRow = {
  employee: string;
  employeeName: string | null;
  department: string | null;
  designation: string | null;
  appraisalTemplate: string | null;
};

export async function getCycleAppraisees(cycle: string): Promise<AppraiseeRow[]> {
  try {
    type Raw = {
      appraisees?: Array<{
        employee: string;
        employee_name?: string | null;
        department?: string | null;
        designation?: string | null;
        appraisal_template?: string | null;
      }> | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Appraisal Cycle", name: cycle },
      as: "user",
    });
    return (doc.appraisees ?? []).map((r) => ({
      employee: r.employee,
      employeeName: r.employee_name ?? null,
      department: r.department ?? null,
      designation: r.designation ?? null,
      appraisalTemplate: r.appraisal_template ?? null,
    }));
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return [];
    return [];
  }
}

export async function setCycleAppraisees(
  cycle: string,
  rows: Array<{
    employee: string;
    department?: string;
    designation?: string;
    appraisal_template?: string;
  }>,
): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_set_appraisal_cycle_appraisees",
    verb: "POST",
    args: { cycle, rows: JSON.stringify(rows) },
    as: "user",
  });
}

export async function bulkCreateAppraisalsFromCycle(cycle: string): Promise<{
  totals: { created: number; skipped: number; errored: number };
  created: string[];
  skipped: Array<{ employee: string; reason: string }>;
  errored: Array<{ employee: string; reason: string }>;
}> {
  return frappeCall({
    method:
      "recruitment_app.api.approvals.admin_create_appraisals_from_cycle",
    verb: "POST",
    args: { cycle },
    as: "user",
  });
}

// ============================================================================
// Appraisal Overview report (read-only)
// ============================================================================

export type AppraisalOverviewRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  cycle: string | null;
  department: string | null;
  designation: string | null;
  selfScore: number;
  avgFeedbackScore: number;
  goalScore: number;
  finalScore: number;
  rating: number;
  feedbackCount: number;
  status: string;
};

export async function listAppraisalOverview(opts?: {
  cycle?: string;
  company?: string;
  department?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<AppraisalOverviewRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.cycle) filters.push(["appraisal_cycle", "=", opts.cycle]);
  if (opts?.company) filters.push(["company", "=", opts.company]);
  if (opts?.department) filters.push(["department", "=", opts.department]);
  if (opts?.fromDate) filters.push(["start_date", ">=", opts.fromDate]);
  if (opts?.toDate) filters.push(["end_date", "<=", opts.toDate]);
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      appraisal_cycle: string | null;
      department: string | null;
      designation: string | null;
      self_score: number | null;
      avg_feedback_score: number | null;
      goal_score: number | null;
      final_score: number | null;
      rating: number | null;
      status: string;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Appraisal",
        fields: [
          "name",
          "employee",
          "employee_name",
          "appraisal_cycle",
          "department",
          "designation",
          "self_score",
          "avg_feedback_score",
          "goal_score",
          "final_score",
          "rating",
          "status",
        ],
        filters: JSON.stringify(filters),
        order_by: "final_score desc",
        limit_page_length: 500,
      },
      as: "user",
    });
    const names = rows.map((r) => r.name);
    const fbRows = names.length
      ? await frappeCall<Array<{ appraisal: string }>>({
          method: "frappe.client.get_list",
          args: {
            doctype: "Employee Performance Feedback",
            fields: ["appraisal"],
            filters: JSON.stringify([["appraisal", "in", names]]),
            limit_page_length: 0,
          },
          as: "user",
        }).catch(() => [])
      : [];
    const fbCount: Record<string, number> = {};
    for (const r of fbRows)
      fbCount[r.appraisal] = (fbCount[r.appraisal] ?? 0) + 1;
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      cycle: r.appraisal_cycle,
      department: r.department,
      designation: r.designation,
      selfScore: Number(r.self_score ?? 0),
      avgFeedbackScore: Number(r.avg_feedback_score ?? 0),
      goalScore: Number(r.goal_score ?? 0),
      finalScore: Number(r.final_score ?? 0),
      rating: Number(r.rating ?? 0),
      feedbackCount: fbCount[r.name] ?? 0,
      status: r.status,
    }));
  } catch {
    return [];
  }
}
