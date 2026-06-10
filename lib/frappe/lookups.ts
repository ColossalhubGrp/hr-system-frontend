import "server-only";
import { frappeCall } from "./client";

/**
 * Tiny helpers for fetching a list of doctype names — used to populate
 * <select> options in forms. Failures fall back to empty arrays so a missing
 * permission never blanks the whole page.
 */
export async function listDoctypeNames(
  doctype: string,
  opts: { orderBy?: string; limit?: number } = {},
): Promise<string[]> {
  try {
    const rows = await frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      args: {
        doctype,
        fields: ["name"],
        order_by: opts.orderBy ?? "name asc",
        limit_page_length: opts.limit ?? 200,
      },
      as: "user",
    });
    return rows.map((r) => r.name).filter(Boolean);
  } catch {
    return [];
  }
}

/** Companies, shift types, holiday lists in one round-trip per. */
export async function listCompanies() {
  return listDoctypeNames("Company");
}
export async function listShiftTypes() {
  return listDoctypeNames("Shift Type");
}
export async function listHolidayLists() {
  return listDoctypeNames("Holiday List");
}
export async function listLeaveTypes() {
  return listDoctypeNames("Leave Type");
}
export async function listAppraisalCyclesNames() {
  return listDoctypeNames("Appraisal Cycle", { orderBy: "name desc", limit: 50 });
}
export async function listAppraisalTemplates() {
  return listDoctypeNames("Appraisal Template");
}
export async function listKraTemplates() {
  return listDoctypeNames("KRA Template");
}
