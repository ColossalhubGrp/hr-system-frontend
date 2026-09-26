import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/** ERPNext "Subscription" — one party, one or more plans, on a recurring schedule. */

export type SubscriptionRow = {
  name: string;
  partyType: string;
  party: string;
  company: string;
  status: string;
  startDate: string;
  endDate: string | null;
  currentInvoiceStart: string | null;
  currentInvoiceEnd: string | null;
};

export type SubscriptionPlanLink = { idx: number; plan: string; qty: number };

export type SubscriptionDetail = SubscriptionRow & {
  plans: SubscriptionPlanLink[];
  daysUntilDue: number;
  followCalendarMonths: boolean;
  generateNewInvoicesPastDueDate: boolean;
  submitInvoice: boolean;
  generateInvoiceAt: string;
  costCenter: string | null;
};

export async function listSubscriptions(): Promise<SubscriptionRow[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Subscription",
      fields: [
        "name", "party_type", "party", "company", "status",
        "start_date", "end_date", "current_invoice_start", "current_invoice_end",
      ],
      order_by: "start_date desc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    partyType: String(r.party_type ?? "Customer"),
    party: String(r.party ?? ""),
    company: String(r.company ?? ""),
    status: String(r.status ?? ""),
    startDate: String(r.start_date ?? ""),
    endDate: (r.end_date as string | null) ?? null,
    currentInvoiceStart: (r.current_invoice_start as string | null) ?? null,
    currentInvoiceEnd: (r.current_invoice_end as string | null) ?? null,
  }));
}

export async function getSubscription(name: string): Promise<SubscriptionDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Subscription", name },
    });
    const plans = (doc.plans as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      partyType: String(doc.party_type ?? "Customer"),
      party: String(doc.party ?? ""),
      company: String(doc.company ?? ""),
      status: String(doc.status ?? ""),
      startDate: String(doc.start_date ?? ""),
      endDate: (doc.end_date as string | null) ?? null,
      currentInvoiceStart: (doc.current_invoice_start as string | null) ?? null,
      currentInvoiceEnd: (doc.current_invoice_end as string | null) ?? null,
      daysUntilDue: Number(doc.days_until_due ?? 0),
      followCalendarMonths: Number(doc.follow_calendar_months ?? 0) === 1,
      generateNewInvoicesPastDueDate: Number(doc.generate_new_invoices_past_due_date ?? 0) === 1,
      submitInvoice: Number(doc.submit_invoice ?? 0) === 1,
      generateInvoiceAt: String(doc.generate_invoice_at ?? "End of the current subscription period"),
      costCenter: (doc.cost_center as string | null) ?? null,
      plans: plans.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        plan: String(r.plan ?? ""),
        qty: Number(r.qty ?? 1),
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type SubscriptionInput = {
  partyType: string;
  party: string;
  company: string;
  startDate: string;
  endDate?: string;
  daysUntilDue: number;
  followCalendarMonths: boolean;
  generateNewInvoicesPastDueDate: boolean;
  submitInvoice: boolean;
  generateInvoiceAt: string;
  plans: Array<{ plan: string; qty: number }>;
};

function payload(input: SubscriptionInput): Record<string, unknown> {
  return {
    party_type: input.partyType,
    party: input.party,
    company: input.company,
    start_date: input.startDate,
    end_date: input.endDate || null,
    days_until_due: input.daysUntilDue,
    follow_calendar_months: input.followCalendarMonths ? 1 : 0,
    generate_new_invoices_past_due_date: input.generateNewInvoicesPastDueDate ? 1 : 0,
    submit_invoice: input.submitInvoice ? 1 : 0,
    generate_invoice_at: input.generateInvoiceAt,
  };
}

export async function createSubscription(input: SubscriptionInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Subscription",
        ...payload(input),
        plans: input.plans.map((p) => ({ plan: p.plan, qty: p.qty })),
      },
    },
  });
  return { name: created.name };
}

export async function updateSubscription(name: string, input: SubscriptionInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Subscription", name, fieldname: payload(input) },
  });
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Subscription",
        name,
        plans: input.plans.map((p) => ({ plan: p.plan, qty: p.qty })),
      },
    },
  });
}

export async function cancelSubscription(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.run_doc_method",
    as: "user",
    verb: "POST",
    args: { dt: "Subscription", dn: name, method: "cancel_subscription" },
  });
}

export async function deleteSubscription(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Subscription", name },
  });
}
