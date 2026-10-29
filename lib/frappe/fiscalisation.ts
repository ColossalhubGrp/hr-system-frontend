import "server-only";
import { frappeCall } from "./client";

/** ZIMRA fiscalisation settings (a single shared record) + sidecar health. */

export type FiscalisationSettings = {
  enabled: boolean;
  sidecarUrl: string;
  defaultTaxId: number | null;
  defaultTaxPercent: string;
};

const DOCTYPE = "Colossal Fiscalisation Settings";

export async function getFiscalisationSettings(): Promise<FiscalisationSettings> {
  const doc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    as: "user",
    args: { doctype: DOCTYPE, name: DOCTYPE },
  });
  return {
    enabled: Number(doc.enabled ?? 0) === 1,
    sidecarUrl: String(doc.sidecar_url ?? "http://127.0.0.1:5007"),
    defaultTaxId: doc.default_tax_id ? Number(doc.default_tax_id) : null,
    defaultTaxPercent: String(doc.default_tax_percent ?? ""),
  };
}

export async function updateFiscalisationSettings(input: FiscalisationSettings): Promise<void> {
  // Full GET -> merge -> save; partial single-doc saves 417 on this build.
  const existing = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    as: "user",
    args: { doctype: DOCTYPE, name: DOCTYPE },
  });
  const doc = {
    ...existing,
    doctype: DOCTYPE,
    enabled: input.enabled ? 1 : 0,
    sidecar_url: input.sidecarUrl,
    default_tax_id: input.defaultTaxId ?? null,
    default_tax_percent: input.defaultTaxPercent || null,
  };
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: { doc },
  });
}

export type FiscalHealth = {
  enabled: boolean;
  ok?: boolean;
  environment?: string;
  registered?: boolean;
  deviceId?: number | null;
  queueSize?: number;
  oldestPendingAgeMs?: number | null;
  dayOpen?: boolean;
  message?: string;
};

export async function getFiscalHealth(): Promise<FiscalHealth> {
  try {
    return await frappeCall<FiscalHealth>({
      method: "colossal_accounting.fiscalisation.fiscal_health",
      as: "user",
    });
  } catch {
    return { enabled: false };
  }
}
