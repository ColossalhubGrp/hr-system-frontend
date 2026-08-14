import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * GET  /api/analytics/semantics/compiled-yaml
 *   Returns { yaml: string, path: string | null, model_code: string }.
 *   `yaml` is the compiled semantic.yaml a caller would land on nao
 *   with — the exact bytes nao reads. `path` is where it lives on
 *   disk (from site_config `nao_semantic_yaml_path`); comes back null
 *   if unset, in which case the Regenerate button is disabled UI-side.
 *
 * POST /api/analytics/semantics/compiled-yaml
 *   Body: { model_code?: string }
 *   Regenerates the on-disk semantic.yaml at the site_config-defined
 *   target. WRITE-tier roles only, gated on the Frappe side by
 *   `compile_and_write_default`.
 *
 * Both endpoints route through colossal_bi's own helpers rather than
 * ``frappe.client.get_site_config`` — v15 filters some keys out of
 * that Guest-callable endpoint, so `nao_semantic_yaml_path` used to
 * come back null even when set.
 */

async function getTarget(): Promise<{ path: string | null; model_code: string }> {
  const target = await frappeCall<{ path: string | null; model_code: string }>({
    method: "colossal_bi.bi_analytics.services.semantic_compiler.get_nao_target",
    verb: "GET",
    args: {},
    as: "user",
  });
  return {
    path: target?.path ?? null,
    model_code: target?.model_code ?? "hr.v1",
  };
}

export async function GET() {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  try {
    const target = await getTarget();
    const yaml = await frappeCall<string>({
      method: "colossal_bi.bi_analytics.services.semantic_compiler.compile_yaml",
      verb: "GET",
      args: { model_code: target.model_code },
      as: "user",
    });
    return NextResponse.json({
      yaml: typeof yaml === "string" ? yaml : String(yaml ?? ""),
      path: target.path,
      model_code: target.model_code,
    });
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
  try {
    const result = await frappeCall({
      method: "colossal_bi.bi_analytics.services.semantic_compiler.compile_and_write_default",
      verb: "POST",
      args: body.model_code ? { model_code: body.model_code } : {},
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
