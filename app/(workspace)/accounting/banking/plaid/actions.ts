"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { savePlaidSettings } from "@/lib/frappe/banking/plaid-settings";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; ok?: boolean };

const schema = z.object({
  enabled: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  plaid_env: z.enum(["sandbox", "development", "production"]),
  plaid_client_id: z.string().trim().optional(),
  plaid_secret: z.string().trim().optional(),
});

export async function savePlaidAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please fix the highlighted fields." };
  try {
    await savePlaidSettings({
      enabled: parsed.data.enabled,
      plaidEnv: parsed.data.plaid_env,
      plaidClientId: parsed.data.plaid_client_id,
      plaidSecret: parsed.data.plaid_secret,
    });
  } catch (err) {
    if (err instanceof FrappeRequestError) return { error: err.message || `Backend error (${err.status}).` };
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
  revalidatePath("/accounting/banking/plaid");
  return { ok: true };
}
