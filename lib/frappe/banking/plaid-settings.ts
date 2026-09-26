import "server-only";
import { frappeCall } from "../client";

/** ERPNext "Plaid Settings" — the Plaid API credentials + environment. */

export type PlaidSettings = {
  enabled: boolean;
  env: string;
  plaidClientId: string | null;
  plaidSecret: string | null;
  plaidEnv: string | null;
};

export async function getPlaidSettings(): Promise<PlaidSettings> {
  const doc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    as: "user",
    args: { doctype: "Plaid Settings", name: "Plaid Settings" },
  });
  return {
    enabled: Number(doc.enabled ?? 0) === 1,
    env: String(doc.env ?? doc.plaid_env ?? "sandbox"),
    plaidClientId: (doc.plaid_client_id as string | null) ?? null,
    plaidSecret: (doc.plaid_secret as string | null) ?? null,
    plaidEnv: (doc.plaid_env as string | null) ?? null,
  };
}

export type PlaidInput = { enabled: boolean; plaidEnv: string; plaidClientId?: string; plaidSecret?: string };

export async function savePlaidSettings(input: PlaidInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Plaid Settings",
      name: "Plaid Settings",
      fieldname: {
        enabled: input.enabled ? 1 : 0,
        plaid_env: input.plaidEnv,
        plaid_client_id: input.plaidClientId || null,
        plaid_secret: input.plaidSecret || null,
      },
    },
  });
}
