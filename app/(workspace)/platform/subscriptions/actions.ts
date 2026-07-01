"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMyAccess } from "@/lib/frappe/roles";
import { setCompanySubscription } from "@/lib/subscriptions/server";
import {
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type FormState = StdFormState;

async function requireSubscriptionAdmin(): Promise<string | null> {
  const access = await getMyAccess();
  if (!access.isPlatformOperator) {
    return "Only the site Administrator (System Manager) can change subscriptions. Per-tenant HR/IT admins don't have this permission.";
  }
  return null;
}

const saveSchema = z.object({
  company: z.string().trim().min(1, "Required."),
  plan_name: z.string().trim().optional(),
  is_active: z.coerce.boolean().optional(),
  valid_until: z.string().trim().optional(),
});

export async function saveSubscriptionAction(
  company: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireSubscriptionAdmin();
  if (blocked) return { error: blocked };
  const parsed = saveSchema.safeParse({
    company,
    plan_name: form.get("plan_name") ?? undefined,
    is_active: form.get("is_active") ?? "true",
    valid_until: form.get("valid_until") ?? undefined,
  });
  if (!parsed.success) return { error: "Check the form fields." };
  // App codes — every checkbox named "app:<code>" that's checked.
  const apps: string[] = [];
  for (const [k] of Array.from(form.entries())) {
    if (k.startsWith("app:")) apps.push(k.slice("app:".length));
  }
  try {
    await setCompanySubscription({
      company,
      apps,
      planName: parsed.data.plan_name,
      isActive: parsed.data.is_active,
      validUntil: parsed.data.valid_until,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/platform/subscriptions");
  revalidatePath(`/platform/subscriptions/${encodeURIComponent(company)}`);
  return {};
}
