"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveSubscriptionSettings } from "@/lib/frappe/subscriptions/settings";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; ok?: boolean };

const schema = z.object({
  grace_period: z.coerce.number().int().min(0).default(0),
  cancel_after_grace: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  prorate: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
});

export async function saveSubSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please fix the highlighted fields." };
  try {
    await saveSubscriptionSettings({
      gracePeriod: parsed.data.grace_period,
      cancelAfterGrace: parsed.data.cancel_after_grace,
      prorate: parsed.data.prorate,
    });
  } catch (err) {
    if (err instanceof FrappeRequestError) return { error: err.message || `Backend error (${err.status}).` };
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
  revalidatePath("/accounting/subscriptions/settings");
  return { ok: true };
}
