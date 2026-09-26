import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/** ERPNext "Subscription Plan" — the priced offering that a Subscription bills. */

export const INTERVALS = ["Day", "Week", "Month", "Year"] as const;
export const PRICE_MODES = ["Fixed Rate", "Based on Price List", "Monthly Rate"] as const;

export type SubscriptionPlan = {
  name: string;
  planName: string;
  item: string | null;
  cost: number;
  currency: string;
  billingInterval: string;
  billingIntervalCount: number;
  priceDetermination: string;
};

export async function listSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Subscription Plan",
      fields: [
        "name", "plan_name", "item", "cost", "currency",
        "billing_interval", "billing_interval_count", "price_determination",
      ],
      order_by: "plan_name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    planName: String(r.plan_name ?? r.name ?? ""),
    item: (r.item as string | null) ?? null,
    cost: Number(r.cost ?? 0),
    currency: String(r.currency ?? "USD"),
    billingInterval: String(r.billing_interval ?? "Month"),
    billingIntervalCount: Number(r.billing_interval_count ?? 1),
    priceDetermination: String(r.price_determination ?? "Fixed Rate"),
  }));
}

export async function getSubscriptionPlan(name: string): Promise<SubscriptionPlan | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Subscription Plan", name },
    });
    return {
      name: String(doc.name ?? name),
      planName: String(doc.plan_name ?? doc.name ?? ""),
      item: (doc.item as string | null) ?? null,
      cost: Number(doc.cost ?? 0),
      currency: String(doc.currency ?? "USD"),
      billingInterval: String(doc.billing_interval ?? "Month"),
      billingIntervalCount: Number(doc.billing_interval_count ?? 1),
      priceDetermination: String(doc.price_determination ?? "Fixed Rate"),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type SubscriptionPlanInput = {
  planName: string;
  item?: string;
  cost: number;
  currency: string;
  billingInterval: string;
  billingIntervalCount: number;
  priceDetermination: string;
};

function payload(input: SubscriptionPlanInput) {
  return {
    plan_name: input.planName,
    item: input.item || null,
    cost: input.cost,
    currency: input.currency,
    billing_interval: input.billingInterval,
    billing_interval_count: input.billingIntervalCount,
    price_determination: input.priceDetermination,
  };
}

export async function createSubscriptionPlan(input: SubscriptionPlanInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Subscription Plan", ...payload(input) } },
  });
  return { name: created.name };
}

export async function updateSubscriptionPlan(name: string, input: SubscriptionPlanInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Subscription Plan", name, fieldname: payload(input) },
  });
}

export async function deleteSubscriptionPlan(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Subscription Plan", name },
  });
}
