import "server-only";
import { frappeCall } from "./client";

/**
 * Thin reader/writer for HR Settings (Frappe Singleton). Today we only care
 * about `default_performance_framework`; extend this file as more company-wide
 * HR defaults move under /settings.
 */

export type EvaluationFramework = "KRA & Goals" | "OKR" | "Balanced Scorecard";

const FRAMEWORKS: EvaluationFramework[] = [
  "KRA & Goals",
  "OKR",
  "Balanced Scorecard",
];

export function isFramework(v: unknown): v is EvaluationFramework {
  return typeof v === "string" && (FRAMEWORKS as string[]).includes(v);
}

export async function getDefaultPerformanceFramework(): Promise<EvaluationFramework> {
  try {
    const resp = await frappeCall<{ default_performance_framework: string | null }>({
      method: "frappe.client.get_value",
      args: {
        doctype: "HR Settings",
        filters: JSON.stringify({}),
        fieldname: ["default_performance_framework"],
      },
      as: "user",
    });
    const v = resp?.default_performance_framework;
    return isFramework(v) ? v : "KRA & Goals";
  } catch {
    return "KRA & Goals";
  }
}

export async function setDefaultPerformanceFramework(
  framework: EvaluationFramework,
): Promise<void> {
  // HR Settings is a singleton — Frappe accepts `name = "HR Settings"`.
  await frappeCall<unknown>({
    method: "frappe.client.set_value",
    verb: "POST",
    args: {
      doctype: "HR Settings",
      name: "HR Settings",
      fieldname: { default_performance_framework: framework },
    },
    as: "user",
  });
}
