"use server";

import { frappeCall, FrappeRequestError } from "./client";
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
        // Frappe v15's typed validator on `get_list` wants a real list
        // for `filters`, not a JSON string — passing the string yields
        // a 417 EXPECTATION FAILED. Same for `fields`.
        fields,
        filters,
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
      error: humaniseSearchError(err, entry?.label ?? doctype),
    };
  }
}

/**
 * Translate a backend search failure into a sentence a non-technical
 * user can act on. Mirrors the create-side humaniser — nothing
 * Frappe / HTTP leaks into on-screen copy.
 */
function humaniseSearchError(err: unknown, label: string): string {
  const raw = err instanceof Error ? err.message : "";
  const s = raw.toLowerCase();
  if (!raw) return `Couldn't load ${label.toLowerCase()} options. Try again.`;
  if (s.includes("403") || s.includes("forbidden") || s.includes("permission")) {
    return `You don't have permission to see ${label.toLowerCase()} options here.`;
  }
  if (s.includes("401") || s.includes("unauthorized") || s.includes("login")) {
    return "Your session has expired — refresh the page and sign in again.";
  }
  if (s.includes("417")) {
    return `Couldn't search for ${label.toLowerCase()}. Reload the page and try again.`;
  }
  if (s.includes("timeout") || s.includes("etimedout")) {
    return "The search is taking too long. Try again in a moment.";
  }
  return `Couldn't load ${label.toLowerCase()} options. Try again or add it from the full form.`;
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

  // Optional inline child row (e.g. tax template → first `taxes` line).
  // The client prefixes those field names with "row__" so they don't
  // collide with parent-level fields.
  if (entry.childRow) {
    const rowErrors: Record<string, string> = {};
    const row: Record<string, unknown> = { ...(entry.childRow.defaults ?? {}) };
    for (const f of entry.childRow.fields) {
      const key = `row__${f.name}`;
      let v = values[key];
      if (f.required && (v === undefined || v === null || v === "")) {
        rowErrors[key] = `${f.label} is required.`;
        continue;
      }
      if (v === undefined || v === null || v === "") continue;
      if (f.type === "check") v = v ? 1 : 0;
      if (f.type === "number") v = Number(v);
      row[f.name] = v;
    }
    if (Object.keys(rowErrors).length > 0) {
      return { ok: false, error: "Fill the required fields.", fieldErrors: rowErrors };
    }
    doc[entry.childRow.tableField] = [row];
  }

  // Cost centres: parent is mandatory on the DocType but a fresh tenant
  // has nothing to pick. Resolve (or create) the company's root group
  // here — same logic the dedicated chart page uses — so the modal
  // can't dead-end.
  if (doctype === "Colossal Cost Center" && !doc.parent_cost_center && doc.company) {
    try {
      const { ensureRootCostCenter } = await import("./cost-centers");
      doc.parent_cost_center = await ensureRootCostCenter(String(doc.company));
    } catch {
      // Fall through — insert will surface the real error.
    }
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
 * user can act on. First tries to pull the real reason out of the
 * Frappe error body (_server_messages / exception, HTML stripped),
 * then falls back to generic class-based sentences for cases where
 * the body wasn't populated.
 */
function humaniseCreateError(err: unknown, label: string): string {
  const detail = err instanceof FrappeRequestError ? err.detail : undefined;
  const real = extractFrappeMessage(detail);
  if (real) return real;
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

/** Pull the real sentence out of a Frappe error body. Prefers `exception`
 *  (populated only on actual throws) over `_server_messages` (which also
 *  carries success/info msgprints). Red/orange indicators only in the
 *  _server_messages fallback — green/yellow are info. HTML stripped so
 *  <strong>/<br>/<ul><li> don't render literally. */
function extractFrappeMessage(detail: unknown): string | null {
  if (!detail || typeof detail !== "object") return null;
  const obj = detail as Record<string, unknown>;
  const exc = obj.exception;
  if (typeof exc === "string" && exc.trim()) {
    const stripped = stripHtml(exc.replace(/^[\w.]+:\s*/, "")).trim();
    if (stripped) return stripped;
  }
  const sm = obj._server_messages;
  if (typeof sm === "string") {
    try {
      const arr = JSON.parse(sm) as unknown;
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const parsed = arr.map((e) => (typeof e === "string" ? JSON.parse(e) : e)) as Array<{
        message?: string;
        indicator?: string;
      }>;
      const err = parsed.find((e) => e?.indicator === "red" || e?.indicator === "orange");
      const pick = err ?? parsed[0];
      const msg = pick?.message;
      if (msg) return stripHtml(String(msg)).trim();
    } catch { /* fall through */ }
  }
  return null;
}

function stripHtml(input: string): string {
  return input
    .replace(/<\s*(br|\/li|\/p|\/div|\/ul|\/ol)\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Expose the field spec to the client for building the quick-create dialog. */
export async function getQuickCreateSpec(doctype: string): Promise<{
  label: string;
  fields: QuickCreateField[];
  seedFields: string[];
  childRow?: {
    tableField: string;
    title: string;
    hint?: string;
    fields: QuickCreateField[];
  };
} | null> {
  const entry = LINK_REGISTRY[doctype];
  if (!entry) return null;
  return {
    label: entry.label,
    fields: entry.fields,
    seedFields: entry.seedFields ?? [],
    childRow: entry.childRow
      ? {
          tableField: entry.childRow.tableField,
          title: entry.childRow.title,
          hint: entry.childRow.hint,
          fields: entry.childRow.fields,
        }
      : undefined,
  };
}
