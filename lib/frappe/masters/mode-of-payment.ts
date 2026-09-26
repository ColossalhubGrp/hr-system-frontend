import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Mode of Payment" master — Cash, Bank Draft, Credit Card,
 * Wire Transfer, etc. Payment Entry and Sales Invoice both link here.
 */

export type ModeOfPaymentType = "Cash" | "Bank" | "General" | "Phone";
export const MODE_TYPES: ModeOfPaymentType[] = ["Cash", "Bank", "General", "Phone"];

export type ModeOfPayment = {
  name: string;
  modeOfPayment: string;
  type: string;
  enabled: boolean;
};

export type ModeOfPaymentAccount = {
  idx: number;
  company: string;
  defaultAccount: string;
};

export type ModeOfPaymentDetail = ModeOfPayment & {
  accounts: ModeOfPaymentAccount[];
};

export async function listModesOfPayment(): Promise<ModeOfPayment[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Mode of Payment",
      fields: ["name", "mode_of_payment", "type", "enabled"],
      order_by: "mode_of_payment asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    modeOfPayment: String(r.mode_of_payment ?? r.name ?? ""),
    type: String(r.type ?? "General"),
    enabled: Number(r.enabled ?? 0) === 1,
  }));
}

export async function getModeOfPayment(name: string): Promise<ModeOfPaymentDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Mode of Payment", name },
    });
    const accounts = (doc.accounts as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      modeOfPayment: String(doc.mode_of_payment ?? doc.name ?? ""),
      type: String(doc.type ?? "General"),
      enabled: Number(doc.enabled ?? 0) === 1,
      accounts: accounts.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        company: String(r.company ?? ""),
        defaultAccount: String(r.default_account ?? ""),
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type ModeOfPaymentInput = {
  modeOfPayment: string;
  type: string;
  enabled: boolean;
  accounts: Array<{ company: string; defaultAccount: string }>;
};

export async function createModeOfPayment(input: ModeOfPaymentInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Mode of Payment",
    mode_of_payment: input.modeOfPayment,
    type: input.type,
    enabled: input.enabled ? 1 : 0,
    accounts: input.accounts.map((a) => ({
      company: a.company,
      default_account: a.defaultAccount,
    })),
  };
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc },
  });
  return { name: created.name };
}

export async function updateModeOfPayment(name: string, input: ModeOfPaymentInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Mode of Payment",
      name,
      fieldname: {
        mode_of_payment: input.modeOfPayment,
        type: input.type,
        enabled: input.enabled ? 1 : 0,
      },
    },
  });
  // Child table can't be set via set_value — use the full-doc save path.
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Mode of Payment",
        name,
        accounts: input.accounts.map((a) => ({
          company: a.company,
          default_account: a.defaultAccount,
        })),
      },
    },
  });
}

export async function deleteModeOfPayment(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Mode of Payment", name },
  });
}
