import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/data-sources/create-dataset
 * Body: { data_source_code, table, title, dataset_code?, description? }
 *
 * Turns a remote table into a Dataset the semantic layer can query.
 * The backend also seeds Field Semantic Catalog rows for the table's
 * columns so per-column quick-metric buttons work identically to
 * CSV-uploaded datasets.
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
      method: "colossal_bi.bi_analytics.api.data_sources.create_dataset_from_table",
      verb: "POST",
      args: body,
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/data-sources/create-dataset] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
