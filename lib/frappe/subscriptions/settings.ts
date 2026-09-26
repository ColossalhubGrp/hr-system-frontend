import "server-only";
import { frappeCall } from "../client";

/** ERPNext "Subscription Settings" — site-wide subscription behaviour. */

export type SubscriptionSettings = {
  gracePeriod: number;
  cancelAfterGrace: boolean;
  prorate: boolean;
};

export async function getSubscriptionSettings(): Promise<SubscriptionSettings> {
  const doc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    as: "user",
    args: { doctype: "Subscription Settings", name: "Subscription Settings" },
  });
  return {
    gracePeriod: Number(doc.grace_period ?? 0),
    cancelAfterGrace: Number(doc.cancel_after_grace ?? 0) === 1,
    prorate: Number(doc.prorate ?? 0) === 1,
  };
}

export async function saveSubscriptionSettings(input: SubscriptionSettings): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Subscription Settings",
      name: "Subscription Settings",
      fieldname: {
        grace_period: input.gracePeriod,
        cancel_after_grace: input.cancelAfterGrace ? 1 : 0,
        prorate: input.prorate ? 1 : 0,
      },
    },
  });
}
