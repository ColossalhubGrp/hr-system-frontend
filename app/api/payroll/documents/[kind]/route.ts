import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { frappeCookieHeader } from "@/lib/frappe/session";

/**
 * Proxies payroll document downloads from Frappe back to the browser.
 *
 *   GET /api/payroll/documents/pay-stub?slip=...
 *   GET /api/payroll/documents/w2?employee=...&year=...
 *   GET /api/payroll/documents/register?pe=...
 *   GET /api/payroll/documents/register.csv?pe=...
 *
 * Stays on the Next.js origin (no CORS), forwards the user's sid
 * cookie, streams the PDF/CSV bytes back. Returns the appropriate
 * Content-Type + Content-Disposition so the browser triggers a
 * download.
 */

const METHODS = {
  "pay-stub": {
    method: "tenant_manager.payroll_engine.api.documents.pay_stub",
    paramMap: { slip: "slip_name" },
    contentType: "application/pdf",
  },
  w2: {
    method: "tenant_manager.payroll_engine.api.documents.w2",
    paramMap: { employee: "employee", year: "year" },
    contentType: "application/pdf",
  },
  register: {
    method: "tenant_manager.payroll_engine.api.documents.payroll_register",
    paramMap: { pe: "payroll_entry" },
    contentType: "application/pdf",
  },
  "register.csv": {
    method: "tenant_manager.payroll_engine.api.documents.payroll_register_csv",
    paramMap: { pe: "payroll_entry" },
    contentType: "text/csv",
  },
} as const satisfies Record<string, { method: string; paramMap: Record<string, string>; contentType: string }>;

export async function GET(
  req: Request,
  { params }: { params: { kind: string } },
) {
  const cfg = METHODS[params.kind as keyof typeof METHODS];
  if (!cfg) return new NextResponse("Unknown document kind", { status: 404 });

  const env = serverEnv();
  const sp = new URL(req.url).searchParams;
  const url = new URL(`/api/method/${cfg.method}`, env.FRAPPE_URL);
  for (const [k, target] of Object.entries(cfg.paramMap)) {
    const v = sp.get(k);
    if (!v) {
      return new NextResponse(`Missing required parameter: ${k}`, { status: 400 });
    }
    url.searchParams.set(target, v);
  }

  const cookie = frappeCookieHeader();
  if (!cookie) {
    return new NextResponse("Not signed in", { status: 401 });
  }

  const upstream = await fetch(url, {
    method: "GET",
    headers: {
      Cookie: cookie,
      "X-Frappe-Site-Name": new URL(env.FRAPPE_URL).hostname,
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new NextResponse(text || "Document fetch failed", { status: upstream.status });
  }

  // Pass through the body + filename if Frappe set it; otherwise let
  // the browser pick from the kind.
  const filename =
    upstream.headers.get("content-disposition")?.match(/filename="?([^"]+)"?/)?.[1] ||
    `payroll-${params.kind}`;
  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": cfg.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
