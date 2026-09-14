import "server-only";
import { frappeCall } from "./client";

/** Lightweight custom `HR Training Supplier` (not ERPNext Supplier —
 *  doesn't require the Buying module). Provisioned by
 *  apps/recruitment_app patches on `bench migrate`. */
export type TrainingSupplierRow = {
  name: string;
  supplierName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  notes: string | null;
};

type Raw = {
  name: string;
  supplier_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  notes: string | null;
};

function toRow(r: Raw): TrainingSupplierRow {
  return {
    name: r.name,
    supplierName: r.supplier_name,
    contactName: r.contact_name,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    website: r.website,
    notes: r.notes,
  };
}

export async function listTrainingSuppliers(): Promise<TrainingSupplierRow[]> {
  try {
    const rows = await frappeCall<Raw[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "HR Training Supplier",
        fields: [
          "name",
          "supplier_name",
          "contact_name",
          "contact_email",
          "contact_phone",
          "website",
          "notes",
        ],
        order_by: "supplier_name asc",
        limit_page_length: 500,
      },
      as: "user",
    });
    return (rows ?? []).map(toRow);
  } catch {
    return [];
  }
}

/** Just names — used to populate the picker on the Training Program form. */
export async function listTrainingSupplierNames(): Promise<string[]> {
  const rows = await listTrainingSuppliers();
  return rows.map((r) => r.supplierName);
}

export type TrainingSupplierInput = {
  supplierName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  notes?: string;
};

export async function createTrainingSupplier(
  input: TrainingSupplierInput,
): Promise<string> {
  const doc: Record<string, unknown> = {
    doctype: "HR Training Supplier",
    supplier_name: input.supplierName,
  };
  if (input.contactName) doc.contact_name = input.contactName;
  if (input.contactEmail) doc.contact_email = input.contactEmail;
  if (input.contactPhone) doc.contact_phone = input.contactPhone;
  if (input.website) doc.website = input.website;
  if (input.notes) doc.notes = input.notes;
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return saved.name;
}

export async function updateTrainingSupplier(
  name: string,
  input: TrainingSupplierInput,
): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.set_value",
    verb: "POST",
    args: {
      doctype: "HR Training Supplier",
      name,
      fieldname: {
        supplier_name: input.supplierName,
        contact_name: input.contactName ?? null,
        contact_email: input.contactEmail ?? null,
        contact_phone: input.contactPhone ?? null,
        website: input.website ?? null,
        notes: input.notes ?? null,
      },
    },
    as: "user",
  });
}

export async function deleteTrainingSupplier(name: string): Promise<void> {
  await frappeCall<unknown>({
    method: "frappe.client.delete",
    verb: "POST",
    args: { doctype: "HR Training Supplier", name },
    as: "user",
  });
}
