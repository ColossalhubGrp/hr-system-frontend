import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * GET /api/analytics/semantics/data-sources/list-tables?code=<data_source_code>
 *
 * Introspects the remote DB via its connector and returns the
 * tables the caller can pick from when creating a Dataset.
 */
export async function GET(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const code = new URL(req.url).searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "code is required." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.data_sources.list_tables",
      verb: "GET",
      args: { code },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/data-sources/list-tables] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
