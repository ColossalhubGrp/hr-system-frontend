import "server-only";
import { frappeCall, FrappeRequestError } from "./client";

// ============================================================================
// Shared submit / cancel through the admin whitelist
// ============================================================================

export type ExtSubmittable =
  | "Exit Interview"
  | "Full and Final Statement"
  | "Overtime Slip";

export async function submitExtDoc(
  doctype: ExtSubmittable,
  name: string,
): Promise<void> {
  await frappeCall<{ ok: boolean }>({
    method: "recruitment_app.api.approvals.admin_submit_generic",
    verb: "POST",
    args: { doctype, name },
    as: "user",
  });
}

export async function cancelExtDoc(
  doctype: ExtSubmittable,
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
// Exit Interview
// ============================================================================

export type ExitInterviewRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  department: string | null;
  designation: string | null;
  dateOfJoining: string | null;
  relievingDate: string | null;
  interviewDate: string | null;
  status: string;
  employeeStatus: string | null;
  docstatus: 0 | 1 | 2;
};

export type ExitInterviewFull = ExitInterviewRow & {
  reasonForLeaving: string | null;
  feedback: string | null;
  ratings: Array<{ criteria: string; per_weightage?: number; rating?: number }>;
  interviewers: Array<{ interviewer: string }>;
};

export async function listExitInterviews(opts?: {
  status?: string;
  employee?: string;
}): Promise<ExitInterviewRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.status) filters.push(["status", "=", opts.status]);
  if (opts?.employee) filters.push(["employee", "=", opts.employee]);
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      department: string | null;
      designation: string | null;
      date_of_joining: string | null;
      relieving_date: string | null;
      interview_date: string | null;
      status: string;
      employee_status: string | null;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Exit Interview",
        fields: [
          "name",
          "employee",
          "employee_name",
          "department",
          "designation",
          "date_of_joining",
          "relieving_date",
          "interview_date",
          "status",
          "employee_status",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "modified desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      department: r.department,
      designation: r.designation,
      dateOfJoining: r.date_of_joining,
      relievingDate: r.relieving_date,
      interviewDate: r.interview_date,
      status: r.status,
      employeeStatus: r.employee_status,
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export async function getExitInterview(
  name: string,
): Promise<ExitInterviewFull | null> {
  try {
    type Raw = {
      name: string;
      docstatus: 0 | 1 | 2;
      employee: string;
      employee_name: string | null;
      department: string | null;
      designation: string | null;
      date_of_joining: string | null;
      relieving_date: string | null;
      interview_date: string | null;
      status: string;
      employee_status: string | null;
      reason_for_leaving: string | null;
      feedback: string | null;
      ratings?: Array<{
        criteria: string;
        per_weightage?: number;
        rating?: number;
      }> | null;
      interviewers?: Array<{ interviewer: string }> | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Exit Interview", name },
      as: "user",
    });
    return {
      name: doc.name,
      docstatus: doc.docstatus,
      employee: doc.employee,
      employeeName: doc.employee_name,
      department: doc.department,
      designation: doc.designation,
      dateOfJoining: doc.date_of_joining,
      relievingDate: doc.relieving_date,
      interviewDate: doc.interview_date,
      status: doc.status,
      employeeStatus: doc.employee_status,
      reasonForLeaving: doc.reason_for_leaving,
      feedback: doc.feedback,
      ratings: doc.ratings ?? [],
      interviewers: doc.interviewers ?? [],
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    return null;
  }
}

export async function createExitInterview(input: {
  employee: string;
  interviewDate?: string;
  reasonForLeaving?: string;
  feedback?: string;
  employeeStatus?: string;
  interviewers?: string[];
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Exit Interview",
        employee: input.employee,
        ...(input.interviewDate ? { interview_date: input.interviewDate } : {}),
        ...(input.reasonForLeaving ? { reason_for_leaving: input.reasonForLeaving } : {}),
        ...(input.feedback ? { feedback: input.feedback } : {}),
        ...(input.employeeStatus ? { employee_status: input.employeeStatus } : {}),
        interviewers: (input.interviewers ?? []).map((u) => ({
          doctype: "Employee Interviewers",
          interviewer: u,
        })),
      },
    },
    as: "user",
  });
  return saved.name;
}

// ============================================================================
// Full and Final Statement
// ============================================================================

export type FnfRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  relievingDate: string | null;
  status: string;
  totalAssetRecovery: number;
  totalPayableAmount: number;
  totalReceivableAmount: number;
  docstatus: 0 | 1 | 2;
};

export type FnfComponent = {
  component: string;
  reference_document_type: string | null;
  reference_document: string | null;
  amount: number;
  account: string | null;
};

export type FnfFull = FnfRow & {
  company: string | null;
  department: string | null;
  designation: string | null;
  employeeSeparation: string | null;
  payrollPayableAccount: string | null;
  costCenter: string | null;
  payables: FnfComponent[];
  receivables: FnfComponent[];
  assets: Array<{
    reference: string;
    asset_name: string | null;
    status: string | null;
    cost: number;
    action: string | null;
  }>;
};

export async function listFullAndFinal(opts?: {
  status?: string;
  employee?: string;
}): Promise<FnfRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.status) filters.push(["status", "=", opts.status]);
  if (opts?.employee) filters.push(["employee", "=", opts.employee]);
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      relieving_date: string | null;
      status: string;
      total_asset_recovery: number | null;
      total_payable_amount: number | null;
      total_receivable_amount: number | null;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Full and Final Statement",
        fields: [
          "name",
          "employee",
          "employee_name",
          "relieving_date",
          "status",
          "total_asset_recovery",
          "total_payable_amount",
          "total_receivable_amount",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "modified desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      relievingDate: r.relieving_date,
      status: r.status,
      totalAssetRecovery: Number(r.total_asset_recovery ?? 0),
      totalPayableAmount: Number(r.total_payable_amount ?? 0),
      totalReceivableAmount: Number(r.total_receivable_amount ?? 0),
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export async function getFullAndFinal(name: string): Promise<FnfFull | null> {
  try {
    type Raw = {
      name: string;
      docstatus: 0 | 1 | 2;
      employee: string;
      employee_name: string | null;
      company: string | null;
      department: string | null;
      designation: string | null;
      relieving_date: string | null;
      status: string;
      employee_separation: string | null;
      payroll_payable_account: string | null;
      cost_center: string | null;
      total_asset_recovery: number | null;
      total_payable_amount: number | null;
      total_receivable_amount: number | null;
      payables?: FnfComponent[] | null;
      receivables?: FnfComponent[] | null;
      assets?: Array<{
        reference: string;
        asset_name: string | null;
        status: string | null;
        cost: number | null;
        action: string | null;
      }> | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Full and Final Statement", name },
      as: "user",
    });
    return {
      name: doc.name,
      docstatus: doc.docstatus,
      employee: doc.employee,
      employeeName: doc.employee_name,
      company: doc.company,
      department: doc.department,
      designation: doc.designation,
      relievingDate: doc.relieving_date,
      status: doc.status,
      employeeSeparation: doc.employee_separation,
      payrollPayableAccount: doc.payroll_payable_account,
      costCenter: doc.cost_center,
      totalAssetRecovery: Number(doc.total_asset_recovery ?? 0),
      totalPayableAmount: Number(doc.total_payable_amount ?? 0),
      totalReceivableAmount: Number(doc.total_receivable_amount ?? 0),
      payables: (doc.payables ?? []).map((r) => ({
        component: r.component,
        reference_document_type: r.reference_document_type,
        reference_document: r.reference_document,
        amount: Number(r.amount ?? 0),
        account: r.account,
      })),
      receivables: (doc.receivables ?? []).map((r) => ({
        component: r.component,
        reference_document_type: r.reference_document_type,
        reference_document: r.reference_document,
        amount: Number(r.amount ?? 0),
        account: r.account,
      })),
      assets: (doc.assets ?? []).map((a) => ({
        reference: a.reference,
        asset_name: a.asset_name,
        status: a.status,
        cost: Number(a.cost ?? 0),
        action: a.action,
      })),
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    return null;
  }
}

export async function createFnfFromSeparation(
  separation: string,
): Promise<{ name: string; existing: boolean }> {
  const r = await frappeCall<{ name: string; existing: boolean }>({
    method: "recruitment_app.api.approvals.admin_create_fnf_from_separation",
    verb: "POST",
    args: { separation },
    as: "user",
  });
  return r;
}

export async function createBlankFnf(input: {
  employee: string;
  relievingDate: string;
  company?: string;
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Full and Final Statement",
        employee: input.employee,
        relieving_date: input.relievingDate,
        ...(input.company ? { company: input.company } : {}),
      },
    },
    as: "user",
  });
  return saved.name;
}

// ============================================================================
// Overtime Slip
// ============================================================================

export type OvertimeSlipRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  fromDate: string | null;
  toDate: string | null;
  totalOvertimeHours: number;
  totalOvertimeAmount: number;
  status: string;
  docstatus: 0 | 1 | 2;
};

export type OvertimeSlipFull = OvertimeSlipRow & {
  company: string | null;
  overtimeDetails: Array<{
    attendance: string;
    date: string | null;
    overtime_hours: number;
    rate?: number;
    amount?: number;
  }>;
};

export async function listOvertimeSlips(opts?: {
  status?: string;
  employee?: string;
}): Promise<OvertimeSlipRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.status) filters.push(["status", "=", opts.status]);
  if (opts?.employee) filters.push(["employee", "=", opts.employee]);
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      from_date: string | null;
      to_date: string | null;
      total_overtime_hours: number | null;
      total_overtime_amount: number | null;
      status: string;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Overtime Slip",
        fields: [
          "name",
          "employee",
          "employee_name",
          "from_date",
          "to_date",
          "total_overtime_hours",
          "total_overtime_amount",
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
      fromDate: r.from_date,
      toDate: r.to_date,
      totalOvertimeHours: Number(r.total_overtime_hours ?? 0),
      totalOvertimeAmount: Number(r.total_overtime_amount ?? 0),
      status: r.status,
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export async function getOvertimeSlip(
  name: string,
): Promise<OvertimeSlipFull | null> {
  try {
    type Raw = {
      name: string;
      docstatus: 0 | 1 | 2;
      employee: string;
      employee_name: string | null;
      company: string | null;
      from_date: string | null;
      to_date: string | null;
      total_overtime_hours: number | null;
      total_overtime_amount: number | null;
      status: string;
      overtime_details?: Array<{
        attendance: string;
        date: string | null;
        overtime_hours: number | null;
        rate?: number | null;
        amount?: number | null;
      }> | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype: "Overtime Slip", name },
      as: "user",
    });
    return {
      name: doc.name,
      docstatus: doc.docstatus,
      employee: doc.employee,
      employeeName: doc.employee_name,
      company: doc.company,
      fromDate: doc.from_date,
      toDate: doc.to_date,
      totalOvertimeHours: Number(doc.total_overtime_hours ?? 0),
      totalOvertimeAmount: Number(doc.total_overtime_amount ?? 0),
      status: doc.status,
      overtimeDetails: (doc.overtime_details ?? []).map((r) => ({
        attendance: r.attendance,
        date: r.date,
        overtime_hours: Number(r.overtime_hours ?? 0),
        rate: r.rate === null || r.rate === undefined ? undefined : Number(r.rate),
        amount:
          r.amount === null || r.amount === undefined ? undefined : Number(r.amount),
      })),
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    return null;
  }
}

export async function createOvertimeSlip(input: {
  employee: string;
  fromDate: string;
  toDate: string;
  company?: string;
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Overtime Slip",
        employee: input.employee,
        from_date: input.fromDate,
        to_date: input.toDate,
        ...(input.company ? { company: input.company } : {}),
      },
    },
    as: "user",
  });
  return saved.name;
}

export async function fetchOvertimeDetails(
  slip: string,
): Promise<{ rows: number }> {
  const r = await frappeCall<{ ok: boolean; rows: number }>({
    method: "recruitment_app.api.approvals.admin_fetch_overtime_details",
    verb: "POST",
    args: { slip },
    as: "user",
  });
  return { rows: r.rows };
}

// ============================================================================
// Employee Onboarding + Separation Templates
// ============================================================================

export type BoardingTemplateRow = {
  name: string;
  department: string | null;
  designation: string | null;
  employeeGrade: string | null;
  company: string | null;
};

export type BoardingActivity = {
  activity_name: string;
  role?: string;
  user?: string;
  begin_on?: number;
  duration?: number;
  task_weight?: number;
  required_for_employee_creation?: boolean;
};

export type BoardingTemplateFull = BoardingTemplateRow & {
  activities: BoardingActivity[];
};

async function listBoardingTemplates(
  doctype: "Employee Onboarding Template" | "Employee Separation Template",
): Promise<BoardingTemplateRow[]> {
  try {
    type R = {
      name: string;
      department: string | null;
      designation: string | null;
      employee_grade: string | null;
      company: string | null;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype,
        fields: ["name", "department", "designation", "employee_grade", "company"],
        order_by: "modified desc",
        limit_page_length: 100,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      department: r.department,
      designation: r.designation,
      employeeGrade: r.employee_grade,
      company: r.company,
    }));
  } catch {
    return [];
  }
}
export const listOnboardingTemplates = () =>
  listBoardingTemplates("Employee Onboarding Template");
export const listSeparationTemplates = () =>
  listBoardingTemplates("Employee Separation Template");

async function getBoardingTemplate(
  doctype: "Employee Onboarding Template" | "Employee Separation Template",
  name: string,
): Promise<BoardingTemplateFull | null> {
  try {
    type Raw = {
      name: string;
      department: string | null;
      designation: string | null;
      employee_grade: string | null;
      company: string | null;
      activities?: Array<{
        activity_name: string;
        role?: string | null;
        user?: string | null;
        begin_on?: number | null;
        duration?: number | null;
        task_weight?: number | null;
        required_for_employee_creation?: 0 | 1 | null;
      }> | null;
    };
    const doc = await frappeCall<Raw>({
      method: "frappe.client.get",
      args: { doctype, name },
      as: "user",
    });
    return {
      name: doc.name,
      department: doc.department,
      designation: doc.designation,
      employeeGrade: doc.employee_grade,
      company: doc.company,
      activities: (doc.activities ?? []).map((a) => ({
        activity_name: a.activity_name,
        role: a.role ?? undefined,
        user: a.user ?? undefined,
        begin_on: a.begin_on === null || a.begin_on === undefined ? undefined : Number(a.begin_on),
        duration: a.duration === null || a.duration === undefined ? undefined : Number(a.duration),
        task_weight:
          a.task_weight === null || a.task_weight === undefined
            ? undefined
            : Number(a.task_weight),
        required_for_employee_creation: Boolean(a.required_for_employee_creation),
      })),
    };
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 404) return null;
    return null;
  }
}
export const getOnboardingTemplate = (name: string) =>
  getBoardingTemplate("Employee Onboarding Template", name);
export const getSeparationTemplate = (name: string) =>
  getBoardingTemplate("Employee Separation Template", name);

async function saveBoardingTemplate(
  doctype: "Employee Onboarding Template" | "Employee Separation Template",
  input: {
    name?: string;
    department?: string;
    designation?: string;
    employeeGrade?: string;
    company?: string;
    activities: BoardingActivity[];
  },
): Promise<string> {
  const doc: Record<string, unknown> = {
    doctype,
    ...(input.name ? { name: input.name } : {}),
    ...(input.department ? { department: input.department } : {}),
    ...(input.designation ? { designation: input.designation } : {}),
    ...(input.employeeGrade ? { employee_grade: input.employeeGrade } : {}),
    ...(input.company ? { company: input.company } : {}),
    activities: input.activities.map((a) => ({
      doctype: "Employee Boarding Activity",
      activity_name: a.activity_name,
      role: a.role,
      user: a.user,
      begin_on: a.begin_on ?? 0,
      duration: a.duration ?? 1,
      task_weight: a.task_weight ?? 0,
      required_for_employee_creation: a.required_for_employee_creation ? 1 : 0,
    })),
  };
  if (input.name && (await frappeCall<{ name?: string } | null>({
    method: "frappe.client.get_value",
    args: { doctype, filters: { name: input.name }, fieldname: "name" },
    as: "user",
  }).catch(() => null))?.name) {
    // Update path
    await frappeCall<unknown>({
      method: "frappe.client.set_value",
      verb: "POST",
      args: {
        doctype,
        name: input.name,
        fieldname: {
          department: input.department ?? null,
          designation: input.designation ?? null,
          employee_grade: input.employeeGrade ?? null,
          company: input.company ?? null,
        },
      },
      as: "user",
    });
    // Replace activities via get + save round-trip
    const cur = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      args: { doctype, name: input.name },
      as: "user",
    });
    (cur as { activities: unknown }).activities = doc.activities;
    await frappeCall<unknown>({
      method: "frappe.client.save",
      verb: "POST",
      args: { doc: cur },
      as: "user",
    });
    return input.name;
  }
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return saved.name;
}
export const saveOnboardingTemplate = (input: Parameters<typeof saveBoardingTemplate>[1]) =>
  saveBoardingTemplate("Employee Onboarding Template", input);
export const saveSeparationTemplate = (input: Parameters<typeof saveBoardingTemplate>[1]) =>
  saveBoardingTemplate("Employee Separation Template", input);

export async function deleteBoardingTemplate(
  doctype: "Employee Onboarding Template" | "Employee Separation Template",
  name: string,
): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    verb: "POST",
    args: { doctype, name },
    as: "user",
  });
}

// ============================================================================
// Skill Assessment
// ============================================================================

export type SkillAssessmentRow = {
  name: string;
  employee: string;
  employeeName: string | null;
  skill: string;
  proficiency: number;
  assessmentDate: string;
  notes: string | null;
  docstatus: 0 | 1 | 2;
};

export async function listSkillAssessments(opts?: {
  employee?: string;
  skill?: string;
}): Promise<SkillAssessmentRow[]> {
  const filters: Array<[string, string, string]> = [];
  if (opts?.employee) filters.push(["employee", "=", opts.employee]);
  if (opts?.skill) filters.push(["skill", "=", opts.skill]);
  try {
    type R = {
      name: string;
      employee: string;
      employee_name: string | null;
      skill: string;
      proficiency: number | null;
      assessment_date: string;
      notes: string | null;
      docstatus: 0 | 1 | 2;
    };
    const rows = await frappeCall<R[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Skill Assessment",
        fields: [
          "name",
          "employee",
          "employee_name",
          "skill",
          "proficiency",
          "assessment_date",
          "notes",
          "docstatus",
        ],
        filters: JSON.stringify(filters),
        order_by: "assessment_date desc",
        limit_page_length: 200,
      },
      as: "user",
    });
    return rows.map((r) => ({
      name: r.name,
      employee: r.employee,
      employeeName: r.employee_name,
      skill: r.skill,
      proficiency: Number(r.proficiency ?? 0),
      assessmentDate: r.assessment_date,
      notes: r.notes,
      docstatus: r.docstatus,
    }));
  } catch {
    return [];
  }
}

export async function createSkillAssessment(input: {
  employee: string;
  skill: string;
  proficiency: number;
  assessmentDate: string;
  notes?: string;
}): Promise<string> {
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: {
      doc: {
        doctype: "Skill Assessment",
        employee: input.employee,
        skill: input.skill,
        proficiency: input.proficiency,
        assessment_date: input.assessmentDate,
        ...(input.notes ? { notes: input.notes } : {}),
      },
    },
    as: "user",
  });
  return saved.name;
}
