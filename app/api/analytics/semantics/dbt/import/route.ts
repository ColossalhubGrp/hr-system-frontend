import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/dbt/import
 * Body: { file_url, data_source_code, selected_metrics?, metric_domain? }
 *
 * Commit the dbt manifest — creates Datasets for referenced models
 * and Metric Definitions for the selected metrics. Runs on top of
 * an existing warehouse Data Source (Postgres / BigQuery / etc.)
 * that dbt materialized into.
 */
export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.dbt_import.import_manifest",
      verb: "POST",
      args: body,
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/dbt/import] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
