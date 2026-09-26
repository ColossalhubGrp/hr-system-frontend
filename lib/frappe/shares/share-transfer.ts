import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/** ERPNext "Share Transfer" — issue, buy-back or transfer of shares. */

export const TRANSFER_TYPES = ["Issue", "Purchase", "Transfer"] as const;

export type ShareTransfer = {
  name: string;
  transferType: string;
  date: string;
  fromShareholder: string | null;
  toShareholder: string | null;
  shareType: string;
  noOfShares: number;
  rate: number;
  amount: number;
  company: string;
  docstatus: 0 | 1 | 2;
};

export type ShareTransferDetail = ShareTransfer & {
  fromFolioNo: string | null;
  toFolioNo: string | null;
  assetAccount: string | null;
  equityOrLiabilityAccount: string | null;
  remarks: string | null;
};

export async function listShareTransfers(): Promise<ShareTransfer[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Share Transfer",
      fields: [
        "name", "transfer_type", "date", "from_shareholder", "to_shareholder",
        "share_type", "no_of_shares", "rate", "amount", "company", "docstatus",
      ],
      order_by: "date desc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    transferType: String(r.transfer_type ?? "Transfer"),
    date: String(r.date ?? ""),
    fromShareholder: (r.from_shareholder as string | null) ?? null,
    toShareholder: (r.to_shareholder as string | null) ?? null,
    shareType: String(r.share_type ?? "Equity"),
    noOfShares: Number(r.no_of_shares ?? 0),
    rate: Number(r.rate ?? 0),
    amount: Number(r.amount ?? 0),
    company: String(r.company ?? ""),
    docstatus: (r.docstatus as 0 | 1 | 2) ?? 0,
  }));
}

export async function getShareTransfer(name: string): Promise<ShareTransferDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Share Transfer", name },
    });
    return {
      name: String(doc.name ?? name),
      transferType: String(doc.transfer_type ?? "Transfer"),
      date: String(doc.date ?? ""),
      fromShareholder: (doc.from_shareholder as string | null) ?? null,
      toShareholder: (doc.to_shareholder as string | null) ?? null,
      shareType: String(doc.share_type ?? "Equity"),
      noOfShares: Number(doc.no_of_shares ?? 0),
      rate: Number(doc.rate ?? 0),
      amount: Number(doc.amount ?? 0),
      company: String(doc.company ?? ""),
      docstatus: (doc.docstatus as 0 | 1 | 2) ?? 0,
      fromFolioNo: (doc.from_folio_no as string | null) ?? null,
      toFolioNo: (doc.to_folio_no as string | null) ?? null,
      assetAccount: (doc.asset_account as string | null) ?? null,
      equityOrLiabilityAccount: (doc.equity_or_liability_account as string | null) ?? null,
      remarks: (doc.remarks as string | null) ?? null,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type ShareTransferInput = {
  transferType: string;
  date: string;
  fromShareholder?: string;
  toShareholder?: string;
  shareType: string;
  noOfShares: number;
  rate: number;
  company: string;
  fromFolioNo?: string;
  toFolioNo?: string;
  assetAccount?: string;
  equityOrLiabilityAccount?: string;
  remarks?: string;
};

function payload(input: ShareTransferInput): Record<string, unknown> {
  return {
    transfer_type: input.transferType,
    date: input.date,
    from_shareholder: input.fromShareholder || null,
    to_shareholder: input.toShareholder || null,
    share_type: input.shareType,
    no_of_shares: input.noOfShares,
    rate: input.rate,
    company: input.company,
    from_folio_no: input.fromFolioNo || null,
    to_folio_no: input.toFolioNo || null,
    asset_account: input.assetAccount || null,
    equity_or_liability_account: input.equityOrLiabilityAccount || null,
    remarks: input.remarks || null,
  };
}

export async function createShareTransfer(input: ShareTransferInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Share Transfer", ...payload(input) } },
  });
  return { name: created.name };
}

export async function updateShareTransfer(name: string, input: ShareTransferInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Share Transfer", name, fieldname: payload(input) },
  });
}

export async function submitShareTransfer(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.submit",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Share Transfer", name } },
  });
}

export async function cancelShareTransfer(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.cancel",
    as: "user",
    verb: "POST",
    args: { doctype: "Share Transfer", name },
  });
}

export async function deleteShareTransfer(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Share Transfer", name },
  });
}
