"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  adjustLeaveAllocation,
  bulkAssignHolidayList,
  cancelLeaveDoc,
  createCompensatoryLeaveRequest,
  createLeaveAllocation,
  createLeaveBlockList,
  createLeaveEncashment,
  createLeavePeriod,
  createLeavePolicyAssignment,
  deleteLeavePeriod,
  submitLeaveDoc,
} from "@/lib/frappe/leave-admin";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

async function requireHr(): Promise<string | null> {
  const a = await getMyAccess();
  if (!(a.isHrAdmin || a.isItAdmin)) return "Only HR admins can manage this.";
  return null;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

// --- Leave Period -----------------------------------------------------------

export async function createLeavePeriodAction(
  _p: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const err = await requireHr();
  if (err) return { error: err };
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Name is required."),
      from_date: isoDate,
      to_date: isoDate,
      company: z.string().trim().optional(),
      is_active: z.union([z.literal("on"), z.literal("")]).optional(),
    })
    .refine((d) => d.to_date >= d.from_date, {
      path: ["to_date"],
      message: "End must be on or after start.",
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? "");
      if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors };
  }
  try {
    await createLeavePeriod({
      name: parsed.data.name,
      fromDate: parsed.data.from_date,
      toDate: parsed.data.to_date,
      company: parsed.data.company,
      isActive: parsed.data.is_active === "on",
    });
  } catch (e) {
    return toFormState(e);
  }
  revalidatePath("/settings/leave-periods");
  return {};
}

export async function deleteLeavePeriodAction(
  _p: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const err = await requireHr();
  if (err) return { error: err };
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Missing name." };
  try {
    await deleteLeavePeriod(name);
  } catch (e) {
    return toFormState(e);
  }
  revalidatePath("/settings/leave-periods");
  return {};
}

// --- Leave Allocation -------------------------------------------------------

export async function createLeaveAllocationAction(
  _p: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const err = await requireHr();
  if (err) return { error: err };
  const parsed = z
    .object({
      employee: z.string().trim().min(1, "Employee is required."),
      leave_type: z.string().trim().min(1, "Leave type is required."),
      from_date: isoDate,
      to_date: isoDate,
      new_leaves_allocated: z.coerce.number().min(0),
      carry_forward: z.union([z.literal("on"), z.literal("")]).optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Fill every required field." };
  try {
    const name = await createLeaveAllocation({
      employee: parsed.data.employee,
      leaveType: parsed.data.leave_type,
      fromDate: parsed.data.from_date,
      toDate: parsed.data.to_date,
      newLeavesAllocated: parsed.data.new_leaves_allocated,
      carryForward: parsed.data.carry_forward === "on",
    });
    // Auto-submit so the balance is usable immediately.
    await submitLeaveDoc("Leave Allocation", name);
  } catch (e) {
    return toFormState(e);
  }
  revalidatePath("/hr/leaves/admin");
  return {};
}

export async function submitLeaveDocAction(
  _p: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const err = await requireHr();
  if (err) return { error: err };
  const doctype = String(form.get("doctype") ?? "") as
    | "Leave Allocation"
    | "Leave Policy Assignment"
    | "Leave Encashment"
    | "Compensatory Leave Request"
    | "Leave Block List";
  const name = String(form.get("name") ?? "").trim();
  if (!doctype || !name) return { error: "Missing doctype or name." };
  try {
    await submitLeaveDoc(doctype, name);
  } catch (e) {
    return toFormState(e);
  }
  revalidatePath("/hr/leaves/admin");
  return {};
}

export async function cancelLeaveDocAction(
  _p: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const err = await requireHr();
  if (err) return { error: err };
  const doctype = String(form.get("doctype") ?? "") as
    | "Leave Allocation"
    | "Leave Policy Assignment"
    | "Leave Encashment"
    | "Compensatory Leave Request"
    | "Leave Block List";
  const name = String(form.get("name") ?? "").trim();
  if (!doctype || !name) return { error: "Missing doctype or name." };
  try {
    await cancelLeaveDoc(doctype, name);
  } catch (e) {
    return toFormState(e);
  }
  revalidatePath("/hr/leaves/admin");
  return {};
}

export async function adjustLeaveAllocationAction(
  _p: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const err = await requireHr();
  if (err) return { error: err };
  const name = String(form.get("name") ?? "").trim();
  const days = Number(form.get("days") ?? 0);
  const direction = (String(form.get("direction") ?? "add") as "add" | "deduct");
  const reason = String(form.get("reason") ?? "").trim();
  if (!name || !(days > 0)) return { error: "Enter a positive number of days." };
  try {
    await adjustLeaveAllocation({ name, days, direction, reason });
  } catch (e) {
    return toFormState(e);
  }
  revalidatePath("/hr/leaves/admin");
  return {};
}

// --- Leave Policy Assignment ------------------------------------------------

export async function createLeavePolicyAssignmentAction(
  _p: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const err = await requireHr();
  if (err) return { error: err };
  const parsed = z
    .object({
      employee: z.string().trim().min(1),
      leave_policy: z.string().trim().min(1),
      assignment_based_on: z.enum(["Leave Period", "Joining Date", "Manual"]),
      leave_period: z.string().trim().optional(),
      effective_from: z.string().trim().optional(),
      effective_to: z.string().trim().optional(),
      carry_forward: z.union([z.literal("on"), z.literal("")]).optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Fill every required field." };
  try {
    const name = await createLeavePolicyAssignment({
      employee: parsed.data.employee,
      leavePolicy: parsed.data.leave_policy,
      assignmentBasedOn: parsed.data.assignment_based_on,
      leavePeriod: parsed.data.leave_period || undefined,
      effectiveFrom: parsed.data.effective_from || undefined,
      effectiveTo: parsed.data.effective_to || undefined,
      carryForward: parsed.data.carry_forward === "on",
    });
    await submitLeaveDoc("Leave Policy Assignment", name);
  } catch (e) {
    return toFormState(e);
  }
  revalidatePath("/hr/leaves/admin");
  return {};
}

// --- Leave Encashment -------------------------------------------------------

export async function createLeaveEncashmentAction(
  _p: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const err = await requireHr();
  if (err) return { error: err };
  const parsed = z
    .object({
      employee: z.string().trim().min(1),
      leave_type: z.string().trim().min(1),
      encashment_date: isoDate,
      pay_via_salary_slip: z.union([z.literal("on"), z.literal("")]).optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Fill every required field." };
  try {
    const name = await createLeaveEncashment({
      employee: parsed.data.employee,
      leaveType: parsed.data.leave_type,
      encashmentDate: parsed.data.encashment_date,
      payViaSalarySlip: parsed.data.pay_via_salary_slip === "on",
    });
    await submitLeaveDoc("Leave Encashment", name);
  } catch (e) {
    return toFormState(e);
  }
  revalidatePath("/hr/leaves/admin");
  return {};
}

// --- Compensatory Leave Request ---------------------------------------------

export async function createCompensatoryLeaveAction(
  _p: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const err = await requireHr();
  if (err) return { error: err };
  const parsed = z
    .object({
      employee: z.string().trim().min(1),
      leave_type: z.string().trim().min(1),
      work_from_date: isoDate,
      work_end_date: isoDate,
      reason: z.string().trim().optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Fill every required field." };
  try {
    const name = await createCompensatoryLeaveRequest({
      employee: parsed.data.employee,
      leaveType: parsed.data.leave_type,
      workFromDate: parsed.data.work_from_date,
      workEndDate: parsed.data.work_end_date,
      reason: parsed.data.reason,
    });
    await submitLeaveDoc("Compensatory Leave Request", name);
  } catch (e) {
    return toFormState(e);
  }
  revalidatePath("/hr/leaves/admin");
  return {};
}

// --- Leave Block List -------------------------------------------------------

export async function createLeaveBlockListAction(
  _p: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const err = await requireHr();
  if (err) return { error: err };
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };
  const company = String(form.get("company") ?? "").trim() || undefined;
  const appliesAll = form.get("applies_to_all_departments") === "on";
  const raw = String(form.get("blocks_json") ?? "[]");
  let blocks: Array<{ block_date: string; reason: string }> = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      blocks = parsed
        .map((b) => ({
          block_date: String(b?.block_date ?? "").trim(),
          reason: String(b?.reason ?? "").trim(),
        }))
        .filter((b) => /^\d{4}-\d{2}-\d{2}$/.test(b.block_date) && b.reason);
    }
  } catch {
    return { error: "Blocks payload is corrupt." };
  }
  if (blocks.length === 0) return { error: "Add at least one blocked date." };
  try {
    await createLeaveBlockList({
      name,
      company,
      appliesToAllDepartments: appliesAll,
      blocks,
    });
  } catch (e) {
    return toFormState(e);
  }
  revalidatePath("/settings/leave-block-lists");
  return {};
}

// --- Bulk Holiday List assignment -------------------------------------------

export async function bulkAssignHolidayListAction(
  _p: StdFormState,
  form: FormData,
): Promise<StdFormState & { updated?: number }> {
  const err = await requireHr();
  if (err) return { error: err };
  const holiday_list = String(form.get("holiday_list") ?? "").trim();
  if (!holiday_list) return { error: "Pick a holiday list." };
  const filters = {
    department: String(form.get("department") ?? "").trim() || undefined,
    branch: String(form.get("branch") ?? "").trim() || undefined,
    company: String(form.get("company") ?? "").trim() || undefined,
    employment_type: String(form.get("employment_type") ?? "").trim() || undefined,
    grade: String(form.get("grade") ?? "").trim() || undefined,
  };
  try {
    const res = await bulkAssignHolidayList({ holidayList: holiday_list, filters });
    revalidatePath("/settings/holiday-lists");
    return { success: true, updated: res.updated } as StdFormState & {
      updated?: number;
    };
  } catch (e) {
    return toFormState(e);
  }
}

// --- Leave Control Panel (bulk allocate) ------------------------------------

export async function controlPanelAllocateAction(
  _p: StdFormState,
  form: FormData,
): Promise<StdFormState & { created?: number; failed?: number }> {
  const err = await requireHr();
  if (err) return { error: err };
  const leave_type = String(form.get("leave_type") ?? "").trim();
  const from_date = String(form.get("from_date") ?? "").trim();
  const to_date = String(form.get("to_date") ?? "").trim();
  const new_leaves_allocated = Number(form.get("new_leaves_allocated") ?? 0);
  const carry_forward = form.get("carry_forward") === "on";
  if (
    !leave_type ||
    !/^\d{4}-\d{2}-\d{2}$/.test(from_date) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to_date) ||
    !(new_leaves_allocated > 0)
  )
    return { error: "Fill leave type, dates and a positive quantity." };
  const employees = form
    .getAll("employees")
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  if (employees.length === 0) return { error: "Pick at least one employee." };

  let created = 0;
  let failed = 0;
  for (const emp of employees) {
    try {
      const name = await createLeaveAllocation({
        employee: emp,
        leaveType: leave_type,
        fromDate: from_date,
        toDate: to_date,
        newLeavesAllocated: new_leaves_allocated,
        carryForward: carry_forward,
      });
      await submitLeaveDoc("Leave Allocation", name);
      created++;
    } catch {
      failed++;
    }
  }
  revalidatePath("/hr/leaves/admin");
  return { success: true, created, failed } as StdFormState & {
    created?: number;
    failed?: number;
  };
}
