import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/dbt/preview
 * Body: { file_url }
 *
 * Parse an uploaded dbt manifest.json (via file_url from Frappe's
 * upload_file handler) and return a preview: project meta + counts
 * + models + metrics list. Nothing is persisted yet — the Steward
 * reviews before committing via the import endpoint.
 */
export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { file_url?: string } | null;
  if (!body?.file_url) {
    return NextResponse.json({ error: "file_url is required." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.dbt_import.preview_manifest",
      verb: "POST",
      args: { file_url: body.file_url },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/dbt/preview] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
