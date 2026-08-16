"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createExpenseClaim,
  decideExpenseClaim,
  type ExpenseClaimCreateInput,
} from "@/lib/frappe/expense-claims";
import { FrappeRequestError } from "@/lib/frappe/client";
import {
  approverErrorMessage,
  resolveApproverUserId,
} from "@/lib/frappe/employee-approvers";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const createSchema = z.object({
  employee: z.string().trim().min(1, "Employee is required."),
  posting_date: isoDate,
  company: z.string().trim().min(1, "Company is required."),
  remark: z.string().trim().optional(),
  // Picker posts an employee id (or a raw email for verbatim options
  // like Administrator). The action resolves it to a user_id (email)
  // before submitting to Frappe.
  approver: z.string().trim().optional(),
  // Single line for now — we'll grow this to a child-row UI later.
  expense_date: isoDate,
  expense_type: z.string().trim().min(1, "Expense type is required."),
  description: z.string().trim().optional(),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, "Amount must be a number.")
    .transform((s) => Number(s)),
});

function toFormState(err: unknown): FormState {
  // Never swallow Next.js redirect/notFound throws — the framework relies on
  // them to bubble up from a Server Action. Catching without re-throwing
  // turns a successful create into a "Something went wrong" toast.
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (
      typeof digest === "string" &&
      (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")
    ) {
      throw err;
    }
  }
  if (err instanceof FrappeRequestError) {
    const detail = err.detail as
      | { _server_messages?: string; message?: string }
      | undefined;
    if (detail?._server_messages) {
      try {
        const arr = JSON.parse(detail._server_messages) as string[];
        const first = arr[0]
          ? (JSON.parse(arr[0]) as { message?: string })
          : undefined;
        if (first?.message) return { error: stripHtml(first.message) };
      } catch {
        /* fall through */
      }
    }
    if (typeof detail?.message === "string") return { error: detail.message };
    return { error: err.message };
  }
  return { error: "Something went wrong. Try again." };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

export async function createExpenseClaimAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const raw: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") raw[k] = v;
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: FormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors };
  }

  // Resolve the picked approver (employee id) → user_id (email) before
  // handing the payload to Frappe.
  let approver: string | undefined = undefined;
  if (parsed.data.approver) {
    const resolved = await resolveApproverUserId(parsed.data.approver);
    if (resolved && !resolved.ok) {
      return {
        error: approverErrorMessage(resolved.reason),
        fieldErrors: { approver: approverErrorMessage(resolved.reason) },
      };
    }
    approver = resolved?.ok ? resolved.userId : undefined;
  }

  const input: ExpenseClaimCreateInput = {
    employee: parsed.data.employee,
    posting_date: parsed.data.posting_date,
    company: parsed.data.company,
    remark: parsed.data.remark,
    approver,
    expenses: [
      {
        expense_date: parsed.data.expense_date,
        expense_type: parsed.data.expense_type,
        description: parsed.data.description,
        amount: parsed.data.amount,
      },
    ],
  };

  let newId: string;
  try {
    newId = await createExpenseClaim(input);
  } catch (err) {
    return toFormState(err);
  }

  revalidatePath("/hr/expense-claims");
  redirect(`/hr/expense-claims/${encodeURIComponent(newId)}`);
}

export type DecisionState = { error?: string };

export async function approveClaimAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await decideExpenseClaim(id, "Approved");
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
  revalidatePath("/hr/expense-claims");
  revalidatePath(`/hr/expense-claims/${encodeURIComponent(id)}`);
  redirect(`/hr/expense-claims/${encodeURIComponent(id)}`);
}

export async function rejectClaimAction(
  id: string,
  _prev: DecisionState,
): Promise<DecisionState> {
  try {
    await decideExpenseClaim(id, "Rejected");
  } catch (err) {
    return toFormState(err) as DecisionState;
  }
  revalidatePath("/hr/expense-claims");
  revalidatePath(`/hr/expense-claims/${encodeURIComponent(id)}`);
  redirect(`/hr/expense-claims/${encodeURIComponent(id)}`);
}
