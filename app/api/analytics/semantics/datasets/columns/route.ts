import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * GET /api/analytics/semantics/datasets/columns?code=<dataset_code>
 *
 * Returns { columns[], metrics[], editable } for the given Dataset —
 * used by the expandable dataset card to render per-column quick-
 * metric buttons and hide ones already turned into metrics.
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
      method: "colossal_bi.bi_analytics.api.datasets.get_dataset_columns",
      verb: "GET",
      args: { dataset_code: code },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/datasets/columns] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
