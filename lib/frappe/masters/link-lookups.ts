import "server-only";
import { frappeCall } from "../client";

/**
 * Lookup helpers for small ERPNext master DocTypes that Customer /
 * Supplier / other party forms link to. Each returns just the name
 * (primary key) — that's all the picker needs. Returns [] if the
 * doctype isn't installed or the caller lacks read permission, so
 * missing masters degrade to an empty dropdown instead of crashing
 * the whole page.
 */

async function listNames(doctype: string): Promise<string[]> {
  try {
    const rows = await frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype,
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 0,
      },
    });
    return rows.map((r) => String(r.name ?? "")).filter(Boolean);
  } catch {
    return [];
  }
}

export const listIndustries = () => listNames("Industry Type");
export const listMarketSegments = () => listNames("Market Segment");
export const listLanguages = () => listNames("Language");
export const listPriceLists = () => listNames("Price List");
export const listTaxCategories = () => listNames("Tax Category");
