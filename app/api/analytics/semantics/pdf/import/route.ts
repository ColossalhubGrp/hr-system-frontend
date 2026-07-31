import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/pdf/import
 * Body: { file_url, selected: [{page_index, table_index, title, code?, header_row_index?}] }
 *
 * For each selected table, funnel the extracted rows through
 * csv_ingestion so it becomes a MariaDB staging table backed by
 * a Dataset row — same downstream pipeline as CSV upload, so
 * quick-metric buttons + Ask (AI) work identically.
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
      method: "colossal_bi.bi_analytics.api.pdf_import.import_pdf_tables",
      verb: "POST",
      args: body,
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/pdf/import] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
