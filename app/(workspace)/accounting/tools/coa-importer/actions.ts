"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { frappeCookieHeader } from "@/lib/frappe/session";
import { FrappeRequestError } from "@/lib/frappe/client";
import { importChartOfAccounts } from "@/lib/frappe/tools/coa-importer";

export type FormState = { error?: string; ok?: boolean; fieldErrors?: Record<string, string> };

const schema = z.object({
  company: z.string().trim().min(1, "Company is required."),
  chart_name: z.string().trim().optional(),
});

function toFormState(err: unknown): FormState {
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (digest === "NEXT_NOT_FOUND") throw err;
  }
  if (err instanceof FrappeRequestError) return { error: err.message || `Backend error (${err.status}).` };
  return { error: err instanceof Error ? err.message : "Something went wrong." };
}

async function uploadFileToFrappe(file: File): Promise<string> {
  const env = serverEnv();
  const cookie = frappeCookieHeader();
  if (!cookie) throw new Error("Not signed in.");
  const fd = new FormData();
  fd.append("file", file, file.name);
  fd.append("is_private", "1");
  fd.append("doctype", "Chart of Accounts Importer");
  const res = await fetch(new URL("/api/method/upload_file", env.FRAPPE_URL), {
    method: "POST",
    headers: { Accept: "application/json", Cookie: cookie },
    body: fd,
  });
  if (!res.ok) throw new Error(`File upload failed (${res.status}).`);
  const j = (await res.json()) as { message?: { file_url?: string } };
  const url = j?.message?.file_url;
  if (!url) throw new Error("File upload returned no URL.");
  return url;
}

export async function importCoaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse({
    company: formData.get("company"),
    chart_name: formData.get("chart_name"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { fieldErrors: { file: "Pick a CSV or JSON file to upload." }, error: "Please choose a file." };
  }
  try {
    const fileUrl = await uploadFileToFrappe(file);
    await importChartOfAccounts({
      company: parsed.data.company,
      fileUrl,
      chartName: parsed.data.chart_name,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/chart-of-accounts");
  redirect(`/accounting/chart-of-accounts?company=${encodeURIComponent(parsed.data.company)}`);
}
