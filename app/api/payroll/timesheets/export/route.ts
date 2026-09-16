import { NextResponse } from "next/server";
import { frappeCall } from "@/lib/frappe/client";
import { getPayRun } from "@/lib/payroll-engine/payruns";

/**
 * CSV export of Payroll Timesheet rows.
 *
 *   GET /api/payroll/timesheets/export?run=<runId>
 *       → all timesheets for one pay run
 *   GET /api/payroll/timesheets/export?from=YYYY-MM-DD&to=YYYY-MM-DD&company=X
 *       → aggregated timesheets for every run whose pay_date is in [from, to]
 *
 * The endpoint proxies `admin_export_timesheets_csv` on the backend
 * and streams the returned CSV back with a Content-Disposition so
 * the browser saves it as a file.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const runId = url.searchParams.get("run");
  let from = url.searchParams.get("from");
  let to = url.searchParams.get("to");
  const company = url.searchParams.get("company") ?? undefined;
  let filename = "payroll-timesheets.csv";

  // Convenience: caller passed a run id, we widen from/to to that run's
  // pay_date so the backend's date-range query returns just its rows.
  if (runId && (!from || !to)) {
    const run = await getPayRun(runId);
    if (run?.pay_date) {
      from = run.pay_date;
      to = run.pay_date;
      filename = `timesheets-${runId}.csv`;
    }
  }

  if (!from || !to) {
    return NextResponse.json(
      { error: "Provide either `run` or both `from` and `to` (YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  try {
    const raw = await frappeCall<{ csv: string } | { message?: { csv: string } }>({
      method: "recruitment_app.api.approvals.admin_export_timesheets_csv",
      args: { from_date: from, to_date: to, ...(company ? { company } : {}) },
      as: "user",
    });
    const inner = (raw as { message?: { csv: string } }).message ?? raw;
    const csv = (inner as { csv?: string }).csv ?? "";

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = (err as { message?: string })?.message ?? "Export failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
