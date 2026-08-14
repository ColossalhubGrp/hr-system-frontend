import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * GET  /api/analytics/semantics/compiled-yaml
 *   Returns { yaml: string, path: string | null }.
 *   `yaml` is the compiled semantic.yaml a caller would land on nao
 *   with — the exact bytes nao reads. `path` is where it lives on
 *   disk (from site_config `nao_semantic_yaml_path`) so the operator
 *   can inspect it out-of-band if needed.
 *
 * POST /api/analytics/semantics/compiled-yaml
 *   Body: { model_code?: string }  (defaults to hr.v1)
 *   Regenerates the on-disk semantic.yaml. Returns
 *   { output_path, bytes, model } from the compiler. Analytics
 *   Steward+ only, gated on the Frappe side by `compile_and_write`.
 *
 * Auto-recompile hooks (colossal_bi 331a63d) already regenerate on
 * every DocType save; the button this powers is for the case where an
 * operator wants to force a fresh render (or verify that what nao
 * sees matches what they think).
 */

// The site_config key that the compiler writes into. Kept in sync with
// colossal_bi/bi_analytics/hooks/nao_compile.py.
const SITE_CONFIG_PATH_KEY = "nao_semantic_yaml_path";
const SITE_CONFIG_MODEL_KEY = "nao_semantic_model_code";

async function targetPath(): Promise<string | null> {
  try {
    const conf = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get_site_config",
      verb: "GET",
      args: {},
      as: "user",
    });
    const value = conf?.[SITE_CONFIG_PATH_KEY];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  } catch {
    // Non-fatal — the UI just won't show the on-disk path.
    return null;
  }
}

async function defaultModelCode(): Promise<string> {
  try {
    const conf = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get_site_config",
      verb: "GET",
      args: {},
      as: "user",
    });
    const value = conf?.[SITE_CONFIG_MODEL_KEY];
    return typeof value === "string" && value.trim() ? value.trim() : "hr.v1";
  } catch {
    return "hr.v1";
  }
}

export async function GET() {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  try {
    const modelCode = await defaultModelCode();
    const yaml = await frappeCall<string>({
      method: "colossal_bi.bi_analytics.services.semantic_compiler.compile_yaml",
      verb: "GET",
      args: { model_code: modelCode },
      as: "user",
    });
    const path = await targetPath();
    return NextResponse.json({ yaml: typeof yaml === "string" ? yaml : String(yaml ?? ""), path, model_code: modelCode });
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/compiled-yaml GET] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { model_code?: string };
  const modelCode = (body.model_code?.trim()) || (await defaultModelCode());
  const path = await targetPath();
  if (!path) {
    return NextResponse.json(
      {
        error:
          "No nao_semantic_yaml_path configured in site_config. Regenerate has nowhere to write.",
      },
      { status: 400 },
    );
  }
  try {
    const result = await frappeCall({
      method: "colossal_bi.bi_analytics.services.semantic_compiler.compile_and_write",
      verb: "POST",
      args: { output_path: path, model_code: modelCode },
      as: "user",
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/compiled-yaml POST] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
