import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/datasets/delete
 * body: { code: string, drop_table?: boolean }
 * Steward-only; refuses on frappe_doctype datasets server-side.
 */

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  let body: { code?: string; drop_table?: boolean };
  try {
    body = (await req.json()) as { code?: string; drop_table?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.code) {
    return NextResponse.json({ error: "code is required." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.datasets.delete_dataset",
      verb: "POST",
      args: { code: body.code, drop_table: body.drop_table === false ? 0 : 1 },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/datasets delete] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
