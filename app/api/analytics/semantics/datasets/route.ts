import { NextResponse } from "next/server";
import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";
import { readSession } from "@/lib/frappe/session";

/**
 * GET /api/analytics/semantics/datasets
 *   Lists every Dataset the caller can see, with per-source counts.
 * POST /api/analytics/semantics/datasets
 *   Body: { file_url, title, code?, description?, delimiter?, encoding? }
 *   Kicks off the ingest_csv backend endpoint AFTER the file has already
 *   been uploaded via Frappe's built-in /api/method/upload_file.
 */

export async function GET() {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.datasets.list_datasets",
      verb: "GET",
      args: {},
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/datasets GET] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

type IngestBody = {
  file_url?: string;
  title?: string;
  code?: string;
  description?: string;
  delimiter?: string;
  encoding?: string;
};

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  let body: IngestBody;
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.file_url || !body.title) {
    return NextResponse.json(
      { error: "file_url and title are required." },
      { status: 400 },
    );
  }

  const args: Record<string, string> = {
    file_url: body.file_url,
    title: body.title,
  };
  if (body.code) args.code = body.code;
  if (body.description) args.description = body.description;
  if (body.delimiter) args.delimiter = body.delimiter;
  if (body.encoding) args.encoding = body.encoding;

  try {
    const data = await frappeCall({
      method: "colossal_bi.bi_analytics.api.datasets.ingest_csv",
      verb: "POST",
      args,
      as: "user",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FrappeRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 500 });
    }
    console.error("[semantics/datasets POST] failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
