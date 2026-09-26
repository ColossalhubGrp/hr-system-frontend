import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Accounting Dimension" master — extra tags (Branch, Project,
 * Region…) that GL entries carry alongside Account + Cost Center for
 * sliced reporting.
 */

export type AccountingDimension = {
  name: string;
  label: string;
  documentType: string;
  fieldname: string;
  disabled: boolean;
};

export type DimensionDefault = {
  idx: number;
  referenceDocument: string;
  company: string;
  defaultDimension: string;
  mandatoryForBs: boolean;
  mandatoryForPl: boolean;
};

export type AccountingDimensionDetail = AccountingDimension & {
  dimensionDefaults: DimensionDefault[];
};

export async function listAccountingDimensions(): Promise<AccountingDimension[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Accounting Dimension",
      // `disabled` not queryable via get_list under Frappe v15 field
      // permissions. Only fetched on the detail form.
      fields: ["name", "label", "document_type", "fieldname"],
      order_by: "label asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    label: String(r.label ?? r.name ?? ""),
    documentType: String(r.document_type ?? ""),
    fieldname: String(r.fieldname ?? ""),
    disabled: false, // see fields comment above
  }));
}

export async function getAccountingDimension(name: string): Promise<AccountingDimensionDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Accounting Dimension", name },
    });
    const defs = (doc.dimension_defaults as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      label: String(doc.label ?? doc.name ?? ""),
      documentType: String(doc.document_type ?? ""),
      fieldname: String(doc.fieldname ?? ""),
      disabled: Number(doc.disabled ?? 0) === 1,
      dimensionDefaults: defs.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        referenceDocument: String(r.reference_document ?? ""),
        company: String(r.company ?? ""),
        defaultDimension: String(r.default_dimension ?? ""),
        mandatoryForBs: Number(r.mandatory_for_bs ?? 0) === 1,
        mandatoryForPl: Number(r.mandatory_for_pl ?? 0) === 1,
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type AccountingDimensionInput = {
  label: string;
  documentType: string;
  fieldname: string;
  disabled: boolean;
};

export async function createAccountingDimension(input: AccountingDimensionInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Accounting Dimension",
        label: input.label,
        document_type: input.documentType,
        fieldname: input.fieldname,
        disabled: input.disabled ? 1 : 0,
      },
    },
  });
  return { name: created.name };
}

export async function updateAccountingDimension(name: string, input: AccountingDimensionInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Accounting Dimension",
      name,
      fieldname: {
        label: input.label,
        document_type: input.documentType,
        fieldname: input.fieldname,
        disabled: input.disabled ? 1 : 0,
      },
    },
  });
}

export async function deleteAccountingDimension(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Accounting Dimension", name },
  });
}
