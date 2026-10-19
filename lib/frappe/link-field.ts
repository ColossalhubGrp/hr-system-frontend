"use server";

import { frappeCall } from "./client";
import { LINK_REGISTRY, type QuickCreateField } from "./link-field-registry";

/**
 * Server actions behind the shared <LinkField> component.
 *   - searchLinkOptions:  typeahead across any linked DocType
 *   - createLinkOption:   insert a new row using the quick-create config
 *
 * Both are deliberately permissive on the DocType parameter: callers
 * pass the DocType name verbatim (e.g. "Customer", "Colossal Account")
 * and we just look it up in LINK_REGISTRY for the quick-create path.
 * Search works for any DocType whether registered or not — the
 * registry only governs INSERT.
 */

export type LinkRow = { name: string; label?: string };

export async function searchLinkOptions(
  doctype: string,
  query: string,
  opts: { filters?: Array<[string, string, unknown]>; limit?: number } = {},
): Promise<{ ok: true; rows: LinkRow[] } | { ok: false; error: string }> {
  const entry = LINK_REGISTRY[doctype];
  const fields = entry?.search ?? ["name"];
  const limit = Math.max(1, Math.min(opts.limit ?? 25, 50));

  // Combine the registry's static filters, the caller's filters, and
  // the typeahead text filter (name LIKE %q% on the first non-"name"
  // search field, falling back to `name` itself).
  const filters: Array<[string, string, unknown]> = [];
  if (entry?.staticFilters) filters.push(...entry.staticFilters);
  if (opts.filters) filters.push(...opts.filters);
  const q = query.trim();
  if (q) {
    const needle = `%${q}%`;
    // Frappe's REST get_list accepts OR via `or_filters`; the typed
    // filter form only ANDs. Easiest cross-version: filter by the
    // name column — hits display label for most masters because
    // Frappe uses name == first search field by convention.
    filters.push(["name", "like", needle]);
  }

  try {
    const rows = await frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype,
        fields,
        filters: JSON.stringify(filters),
        limit_page_length: limit,
        order_by: "modified desc",
      },
    });
    const mapped: LinkRow[] = (rows ?? []).map((r) => {
      const name = String(r.name ?? "");
      // Display label = first field after `name` if present, else name itself.
      const labelField = fields.find((f) => f !== "name");
      const label = labelField ? String(r[labelField] ?? name) : name;
      return { name, label: label !== name ? `${label} (${name})` : name };
    });
    return { ok: true, rows: mapped };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Lookup failed.",
    };
  }
}

export async function createLinkOption(
  doctype: string,
  values: Record<string, unknown>,
): Promise<{ ok: true; name: string } | { ok: false; error: string; fieldErrors?: Record<string, string> }> {
  const entry = LINK_REGISTRY[doctype];
  if (!entry) {
    return { ok: false, error: `No quick-create config for "${doctype}".` };
  }

  // Validate required fields client said it collected.
  const fieldErrors: Record<string, string> = {};
  for (const f of entry.fields) {
    if (f.required && !values[f.name]) {
      fieldErrors[f.name] = `${f.label} is required.`;
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Fill the required fields.", fieldErrors };
  }

  // Coerce check fields to 0/1 — Frappe expects int, not boolean.
  const doc: Record<string, unknown> = { doctype };
  for (const f of entry.fields) {
    let v = values[f.name];
    if (v === undefined || v === null || v === "") continue;
    if (f.type === "check") v = v ? 1 : 0;
    if (f.type === "number") v = Number(v);
    doc[f.name] = v;
  }
  // Seed fields (e.g. company) come in via `values` from the host form.
  for (const key of entry.seedFields ?? []) {
    if (values[key] != null && doc[key] == null) doc[key] = values[key];
  }

  try {
    const created = await frappeCall<{ name: string }>({
      method: "frappe.client.insert",
      as: "user",
      verb: "POST",
      args: { doc },
    });
    return { ok: true, name: created.name };
  } catch (err) {
    return { ok: false, error: humaniseCreateError(err, entry.label) };
  }
}

/**
 * Translate a backend create failure into a sentence a non-technical
 * user can act on. Keeps every Frappe/HTTP/stack detail out of the UI
 * (we never surface things like "frappe.client.insert", "403
 * FORBIDDEN", or Python tracebacks in strings an HR user will read).
 */
function humaniseCreateError(err: unknown, label: string): string {
  const raw = err instanceof Error ? err.message : "";
  const s = raw.toLowerCase();
  if (!raw) return `Couldn't add this ${label.toLowerCase()}. Please try again.`;
  if (s.includes("403") || s.includes("forbidden") || s.includes("permission")) {
    return `You don't have permission to add a new ${label} from here — ask an admin to grant you Create access.`;
  }
  if (s.includes("duplicate") || s.includes("already exists") || s.includes("409")) {
    return `A ${label.toLowerCase()} with that name already exists — pick it from the list instead.`;
  }
  if (s.includes("mandatory") || s.includes("required")) {
    return "Fill in the required fields and try again.";
  }
  if (s.includes("401") || s.includes("unauthorized") || s.includes("login")) {
    return "Your session has expired — refresh the page and sign in again.";
  }
  if (s.includes("validation")) {
    return `That ${label.toLowerCase()} couldn't be saved — check the values and try again.`;
  }
  // Last resort: generic sentence that still names the thing we tried to add.
  return `Couldn't add this ${label.toLowerCase()}. Please try again or add it from the full form.`;
}

/** Expose the field spec to the client for building the quick-create dialog. */
export async function getQuickCreateSpec(doctype: string): Promise<{
  label: string;
  fields: QuickCreateField[];
  seedFields: string[];
} | null> {
  const entry = LINK_REGISTRY[doctype];
  if (!entry) return null;
  return {
    label: entry.label,
    fields: entry.fields,
    seedFields: entry.seedFields ?? [],
  };
}
