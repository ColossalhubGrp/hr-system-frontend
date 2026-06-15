"use server";

import { revalidatePath } from "next/cache";
import { frappeCall } from "@/lib/frappe/client";
import { getMyAccess } from "@/lib/frappe/roles";

type Result = { ok: true; id: string } | { ok: false; error: string };

/**
 * Approve a draft Payroll Entry by submitting it. Frappe enforces submit
 * permission via DocPerm on Payroll Entry (Finance Reviewer has submit=1,
 * Payroll Officer has full submit). We re-check the bundle here so a 200
 * doesn't sneak through if the caller's roles changed mid-request.
 */
export async function approvePayrollEntryAction(
  entryId: string,
): Promise<Result> {
  if (!entryId) return { ok: false, error: "Missing payroll entry id." };

  const access = await getMyAccess();
  if (!access.isPayrollAdmin && !access.isPayrollReviewer) {
    return {
      ok: false,
      error: "Only Payroll Officers or Finance Reviewers can approve payroll runs.",
    };
  }

  try {
    // frappe.client.submit takes the full doc — fetch first, then submit.
    type EntryDoc = { name: string; docstatus: 0 | 1 | 2 };
    const entry = await frappeCall<EntryDoc>({
      method: "frappe.client.get",
      args: { doctype: "Payroll Entry", name: entryId },
      as: "user",
    });
    if (entry.docstatus !== 0) {
      return {
        ok: false,
        error:
          entry.docstatus === 1
            ? "This payroll run was already approved."
            : "This payroll run was cancelled and can't be re-approved.",
      };
    }
    await frappeCall({
      method: "frappe.client.submit",
      verb: "POST",
      args: { doc: entry },
      as: "user",
    });
    revalidatePath("/payroll/review");
    return { ok: true, id: entryId };
  } catch (err) {
    const msg =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Failed to submit payroll entry.";
    return { ok: false, error: msg };
  }
}
