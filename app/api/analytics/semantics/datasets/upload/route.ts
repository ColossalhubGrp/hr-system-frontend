import { NextResponse } from "next/server";
import { frappeBaseUrl, frappeCookieHeader, readSession } from "@/lib/frappe/session";

/**
 * POST /api/analytics/semantics/datasets/upload
 *
 * Proxies chunked file upload to Frappe's built-in
 * /api/method/upload_file. The browser sends multipart form-data
 * with `file` (the raw chunk bytes), `filename`, `is_private`,
 * `chunk_index`, `total_chunk_count`, `total_file_size`. Frappe
 * assembles the chunks server-side and returns the final File
 * record on the last chunk.
 *
 * We forward the multipart body verbatim, injecting the session
 * cookie so Frappe treats the request as authenticated.
 */

export async function POST(req: Request) {
  const { userId } = readSession();
  if (!userId || userId === "Guest") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Stream the multipart body straight to Frappe. `duplex: 'half'` is
  // required by Node fetch when the body is a stream.
  const upstream = await fetch(
    `${frappeBaseUrl().replace(/\/$/, "")}/api/method/upload_file`,
    {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") || "multipart/form-data",
        Cookie: frappeCookieHeader(),
      },
      body: req.body,
      // @ts-expect-error Node fetch supports duplex; DOM lib doesn't type it.
      duplex: "half",
    },
  );

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    },
  });
}
