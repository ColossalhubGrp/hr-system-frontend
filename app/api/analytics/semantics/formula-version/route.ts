import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/formula-version
 *
 * Creates a Candidate Formula Version for a metric in the caller's
 * tenant child Semantic Model (lazily provisioned by the backend).
 * Proxies to colossal_bi.bi_analytics.api.semantics.create_formula_version.
 */

type CreateBody = {
  metric?: string;
  override_kind?: string;
  change_reason?: string;
  expression?: string;
  custom_sql?: string;
  source_field?: string;
  aggregation?: string;
  aggregation_field?: string;
  has_assumptions?: boolean | number;
  assumption_notes?: string;
};

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.metric) {
    return NextResponse.json({ error: "metric is required." }, { status: 400 });
  }
  if (!body.override_kind) {
    return NextResponse.json({ error: "override_kind is required." }, { status: 400 });
  }
  if (!(body.change_reason || "").trim()) {
    return NextResponse.json({ error: "change_reason is required." }, { status: 400 });
  }

  const args: Record<string, string | number> = {
    metric: body.metric,
    override_kind: body.override_kind,
    change_reason: body.change_reason ?? "",
    expression: body.expression ?? "",
    custom_sql: body.custom_sql ?? "",
    source_field: body.source_field ?? "",
    aggregation: body.aggregation ?? "",
    aggregation_field: body.aggregation_field ?? "",
    has_assumptions: body.has_assumptions ? 1 : 0,
    assumption_notes: body.assumption_notes ?? "",
  };

  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.semantics.create_formula_version",
      verb: "POST",
      args,
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/formula-version create] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
