import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/metric
 *
 * Create a brand-new metric definition in the specified domain. Called
 * from the "+ New metric" modal on /analytics/semantics.
 *
 * Body:
 *   {
 *     title, domain, computation_type ('simple' | 'computed' | 'sql'),
 *     description?, source_doctype?, aggregation?, aggregation_field?,
 *     base_filters?, formula?, custom_sql?, unit?, format?, higher_is_better?
 *   }
 *
 * Field-shape validation happens server-side (Frappe throws with a
 * clear message) — this route just forwards the payload and surfaces
 * the error. HR-editor role check happens there too.
 */
export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await frappeCall({
      method: "colossal_bi.bi_analytics.api.semantics.create_metric",
      verb: "POST",
      args: body,
      as: "user",
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
    console.error("[semantics/metric POST] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
