"use server";

import { frappeCall, FrappeRequestError } from "../client";

/**
 * Inline "+ Add" for the small Link-target masters that party forms
 * (Customer / Supplier) reference. Each entry declares how to build
 * the minimum-viable insert payload from a single user-typed name.
 * Nothing outside this whitelist can be created via this action.
 */
type Recipe = (name: string) => Record<string, unknown>;
const RECIPES: Record<string, { doctype: string; recipe: Recipe }> = {
  industry: {
    doctype: "Industry Type",
    recipe: (n) => ({ doctype: "Industry Type", industry: n }),
  },
  "market-segment": {
    doctype: "Market Segment",
    recipe: (n) => ({ doctype: "Market Segment", market_segment: n }),
  },
  language: {
    doctype: "Language",
    recipe: (n) => ({
      doctype: "Language",
      language_code: n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40),
      language_name: n,
      enabled: 1,
    }),
  },
  "price-list": {
    doctype: "Price List",
    recipe: (n) => ({
      doctype: "Price List",
      price_list_name: n,
      currency: "USD",
      enabled: 1,
      selling: 1,
      buying: 1,
    }),
  },
  "tax-category": {
    doctype: "Tax Category",
    recipe: (n) => ({ doctype: "Tax Category", title: n }),
  },
  "payment-terms-template": {
    doctype: "Payment Terms Template",
    recipe: (n) => ({
      doctype: "Payment Terms Template",
      template_name: n,
      terms: [
        {
          doctype: "Payment Terms Template Detail",
          description: "Net 30",
          invoice_portion: 100,
          due_date_based_on: "Day(s) after invoice date",
          credit_days: 30,
        },
      ],
    }),
  },
};

export type CreateLinkMasterResult = { ok: true; name: string } | { ok: false; error: string };

export async function createLinkMasterAction(kind: string, rawName: string): Promise<CreateLinkMasterResult> {
  const name = (rawName ?? "").trim();
  if (!name) return { ok: false, error: "A name is required." };
  const spec = RECIPES[kind];
  if (!spec) return { ok: false, error: "That option can't be added from here." };

  try {
    const doc = await frappeCall<{ name: string }>({
      method: "frappe.client.insert",
      verb: "POST",
      as: "user",
      args: { doc: spec.recipe(name) },
    });
    return { ok: true, name: doc?.name ?? name };
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return { ok: false, error: friendlyFrappeError(err) };
    }
    return { ok: false, error: "Couldn't add it. Try again in a moment." };
  }
}

function friendlyFrappeError(err: FrappeRequestError): string {
  const detail = err.detail as { exception?: string; _server_messages?: string } | undefined;
  if (detail?._server_messages) {
    try {
      const arr = JSON.parse(detail._server_messages) as string[];
      const parsed = arr.map((s) => {
        try {
          return (JSON.parse(s) as { message?: string }).message ?? s;
        } catch {
          return s;
        }
      });
      const first = parsed[0];
      if (first) return first.replace(/<[^>]+>/g, "");
    } catch {
      // fall through
    }
  }
  if (err.status === 403) return "You don't have permission to add this.";
  if (err.status === 409 || /Duplicate/i.test(err.message)) return "That name is already taken.";
  return err.message || "Couldn't add it.";
}
