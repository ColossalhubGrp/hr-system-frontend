import { NextRequest, NextResponse } from "next/server";
import { listValues } from "@/lib/references/server";

/**
 * GET /api/references/:master?search=&limit=&include_inactive=&company=
 *
 * Thin REST wrapper around `listValues`, intended for client components
 * that need search-as-you-type / paginated dropdown loads. Server pages
 * should call `listValues` directly from `lib/references/server.ts` to
 * avoid the round-trip.
 *
 * Auth: same sid the rest of the workspace uses (handled inside
 * frappeCall via `as: "user"`). Returns 401 when the user can't read
 * the master.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ master: string }> },
) {
  const params = await context.params;
  const master = decodeURIComponent(params.master ?? "");
  if (!master) {
    return NextResponse.json({ error: "Missing master" }, { status: 400 });
  }

  const u = new URL(req.url);
  const search = u.searchParams.get("search") ?? undefined;
  const limitStart = Number(u.searchParams.get("limit_start") ?? 0);
  const limitPageLength = Number(u.searchParams.get("limit") ?? 50);
  const includeInactive = u.searchParams.get("include_inactive") === "1";
  const company = u.searchParams.get("company") ?? undefined;

  try {
    const data = await listValues(master, {
      search,
      limitStart,
      limitPageLength,
      includeInactive,
      company,
    });
    return NextResponse.json(data, {
      // Browsers may cache aggressively; per-master changes are rare.
      // Keep it short so admin edits are visible quickly.
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Request failed.";
    const status = /not permitted|unauthorized/i.test(msg) ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
