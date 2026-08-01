import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/dashboards/save-answer
 * Body: { question, dashboard_code?, dashboard_title? }
 *
 * Save a BI answer as a new tile. If dashboard_code is omitted, a
 * new dashboard is created with dashboard_title (defaults to
 * "My Dashboard"). Backend re-runs the analysis with review=True
 * so the tile lands with a fresh Adversarial Reviewer verdict —
 * this endpoint is the primary UI trigger for the reviewer we
 * shipped in 3c.
 *
 * ~5-6s latency expected (analyze + review round-trip).
 */
export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    question?: string;
    dashboard_code?: string;
    dashboard_title?: string;
  } | null;
  if (!body?.question?.trim()) {
    return NextResponse.json({ error: "question is required." }, { status: 400 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.dashboards.save_answer",
      verb: "POST",
      args: {
        question: body.question.trim(),
        dashboard_code: body.dashboard_code,
        dashboard_title: body.dashboard_title,
      },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[dashboards/save-answer] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
