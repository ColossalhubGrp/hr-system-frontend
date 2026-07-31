import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/data-sources/create-external
 *
 * Creates a Data Source pointing at an external OLTP DB and
 * immediately runs a health check so the caller gets a green/red
 * badge in one round-trip. Body mirrors the backend endpoint's
 * kwargs; password is transported in-body — HTTPS gates it, and
 * the backend writes it into an encrypted Password field.
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
      method: "colossal_bi.bi_analytics.api.data_sources.create_external",
      verb: "POST",
      args: body,
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/data-sources/create-external] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
