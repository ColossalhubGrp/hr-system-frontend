import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/datasets/create-metric
 * body: { dataset_code, column, aggregation, title,
 *         description?, domain?, metric_code?,
 *         unit?, metric_format? }
 *
 * Proxies to colossal_bi.bi_analytics.api.datasets.create_metric_from_column.
 */

type Body = {
  dataset_code?: string;
  column?: string;
  aggregation?: string;
  title?: string;
  description?: string;
  domain?: string;
  metric_code?: string;
  unit?: string;
  metric_format?: string;
};

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  for (const k of ["dataset_code", "column", "aggregation", "title"] as const) {
    if (!body[k]) {
      return NextResponse.json({ error: `${k} is required.` }, { status: 400 });
    }
  }

  const args: Record<string, string> = {};
  for (const k of Object.keys(body) as (keyof Body)[]) {
    const v = body[k];
    if (v !== undefined && v !== null && v !== "") args[k] = String(v);
  }

  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.datasets.create_metric_from_column",
      verb: "POST",
      args,
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/datasets/create-metric] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
