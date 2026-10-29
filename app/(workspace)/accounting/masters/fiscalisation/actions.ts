"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateFiscalisationSettings } from "@/lib/frappe/fiscalisation";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = {
  error?: string;
  saved?: boolean;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  enabled: z
    .union([z.literal("on"), z.literal("")])
    .optional()
    .transform((v) => v === "on"),
  sidecar_url: z.string().trim().url("Enter a valid URL, e.g. http://127.0.0.1:5007"),
  default_tax_id: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().positive("Must be a positive number.").optional(),
  ),
  default_tax_percent: z.string().trim().optional(),
});

export async function saveFiscalisationSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try {
    await updateFiscalisationSettings({
      enabled: parsed.data.enabled,
      sidecarUrl: parsed.data.sidecar_url,
      defaultTaxId: parsed.data.default_tax_id ?? null,
      defaultTaxPercent: parsed.data.default_tax_percent ?? "",
    });
  } catch (err) {
    if (err instanceof Error && !(err instanceof FrappeRequestError)) {
      return { error: err.message };
    }
    const detail = err instanceof FrappeRequestError ? err.detail : undefined;
    const real = extractFrappeMessage(detail);
    if (real) return { error: real };
    return { error: "Couldn't save these settings. Please try again." };
  }
  revalidatePath("/accounting/masters/fiscalisation");
  return { saved: true };
}

function extractFrappeMessage(detail: unknown): string | null {
  if (!detail || typeof detail !== "object") return null;
  const obj = detail as Record<string, unknown>;
  const exc = obj.exception;
  if (typeof exc === "string" && exc.trim()) {
    const stripped = stripHtml(exc.replace(/^[\w.]+:\s*/, "")).trim();
    if (stripped) return stripped;
  }
  const sm = obj._server_messages;
  if (typeof sm === "string") {
    try {
      const arr = JSON.parse(sm) as unknown;
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const parsed = arr.map((e) => (typeof e === "string" ? JSON.parse(e) : e)) as Array<{
        message?: string;
        indicator?: string;
      }>;
      const err = parsed.find((e) => e?.indicator === "red" || e?.indicator === "orange");
      const pick = err ?? parsed[0];
      if (pick?.message) return stripHtml(String(pick.message)).trim();
    } catch { /* fall through */ }
  }
  return null;
}

function stripHtml(input: string): string {
  return input
    .replace(/<\s*(br|\/li|\/p|\/div|\/ul|\/ol)\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
