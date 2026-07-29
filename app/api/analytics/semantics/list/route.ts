import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * Proxies /analytics/semantics's list view to the Frappe
 * colossal_bi.bi_analytics.api.semantics.list_metrics endpoint.
 *
 * Returned shape mirrors the Python endpoint 1:1 — we don't reshape
 * here, only pass through, so a change to the backend surfaces in
 * the UI without a matching client edit.
 */

type Metric = {
  code: string;
  title: string;
  description: string;
  computation_type: string;
  format: string;
  unit: string;
  dimension_count: number;
  has_override: boolean;
  override_status: string | null;
  override_version: number | null;
};

type Domain = {
  code: string;
  title: string;
  description: string;
  icon: string;
  metrics: Metric[];
};

type ListResponse = {
  active_model: string | null;
  model_chain: string[];
  domains: Domain[];
  editable: boolean;
};

export async function GET() {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const data = await frappeCall<ListResponse>({
      method: "colossal_bi.bi_analytics.api.semantics.list_metrics",
      verb: "GET",
      args: {},
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/list] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
