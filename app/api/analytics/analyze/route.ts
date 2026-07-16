import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * Proxies the /analytics/ask page to Frappe's coordinator (Plan →
 * Execute → Viz → Explain → Recommend). One request per user turn;
 * the pipeline runs sequentially server-side and returns everything
 * in a single payload the page can render without extra roundtrips.
 */

type AnalyzeResponse = {
  question: string;
  plan: unknown | null;
  refused: boolean;
  refusal_reason: string | null;
  data:
    | {
        columns: string[];
        rows: Record<string, unknown>[];
        row_count: number;
        metric: { code: string; name: string; unit: string; format: string };
      }
    | null;
  viz:
    | {
        viz_type: string;
        value_field: string;
        category_field: string | null;
        time_field: string | null;
        series_field: string | null;
        value_label: string;
        category_label: string | null;
        hint: string;
      }
    | null;
  narrative: string | null;
  followups: { intent: string; question: string }[];
  audit_log_id: string;
  stage_latencies: Record<string, number>;
  total_latency_ms: number;
  error: string | null;
};

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "Question cannot be empty." }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "Question is too long (max 500 chars)." }, { status: 400 });
  }

  try {
    const data = await frappeCall<AnalyzeResponse>({
      method: "tenant_manager.analytics.api.analytics.analyze",
      verb: "POST",
      args: { question },
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[analytics/analyze] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
