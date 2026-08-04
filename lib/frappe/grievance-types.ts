import "server-only";
import { frappeCall } from "./client";

export type GrievanceTypeRow = {
  /** DocType `name` — user-supplied. Also the label. */
  name: string;
  description: string | null;
};

export async function listGrievanceTypes(): Promise<GrievanceTypeRow[]> {
  type Row = { name: string; description: string | null };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Grievance Type",
      fields: ["name", "description"],
      order_by: "name asc",
      limit_page_length: 500,
    },
    as: "user",
  }).catch(() => [] as Row[]);
  return rows.map((r) => ({ name: r.name, description: r.description }));
}

export async function createGrievanceType(input: {
  name: string;
  description?: string;
}): Promise<string> {
  const doc = {
    doctype: "Grievance Type",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
  };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return saved.name;
}

export async function updateGrievanceType(input: {
  originalName: string;
  name: string;
  description: string;
}): Promise<string> {
  const finalName = input.name.trim();
  // Rename first if the label changed — Grievance Type autoname is
  // `prompt`, so the DocType's `name` IS the user-facing label.
  let currentName = input.originalName;
  if (finalName && finalName !== input.originalName) {
    await frappeCall<unknown>({
      method: "frappe.client.rename_doc",
      verb: "POST",
      args: {
        doctype: "Grievance Type",
        old_name: input.originalName,
        new_name: finalName,
        merge: 0,
      },
      as: "user",
    });
    currentName = finalName;
  }
  // Then update the description (unconditional — allow empty to clear).
  await frappeCall<unknown>({
    method: "frappe.client.set_value",
    verb: "POST",
    args: {
      doctype: "Grievance Type",
      name: currentName,
      fieldname: { description: input.description ?? "" },
    },
    as: "user",
  });
  return currentName;
}

export async function deleteGrievanceType(name: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    verb: "POST",
    args: { doctype: "Grievance Type", name },
    as: "user",
  });
}
