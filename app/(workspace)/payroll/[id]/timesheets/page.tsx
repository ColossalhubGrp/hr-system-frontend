import { notFound, redirect } from "next/navigation";
import { getPayRun } from "@/lib/payroll-engine/payruns";
import { listTimesheetsForRun } from "@/lib/frappe/payroll-timesheets";
import { TimesheetsPage } from "@/components/payroll/timesheets-page";

export const metadata = { title: "Timesheets · Payroll · Colossal HR" };
export const dynamic = "force-dynamic";

/**
 * Timesheet review page — the stop between capturing hours (from
 * Attendance, CSV, or manual entry) and running payroll. HR reviews
 * flagged rows, corrects anything wrong, then bulk-approves. Only
 * approved rows flow into the wizard's Hourly step + the salaried
 * auto-OT earning.
 */
export default async function TimesheetsPageServer({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const run = await getPayRun(id);
  if (!run) notFound();
  if (run.status !== "OPEN") {
    // After processing the run is read-only — send the user to the
    // register instead.
    redirect(`/payroll/${encodeURIComponent(id)}`);
  }

  const initial = await listTimesheetsForRun(id);

  return (
    <TimesheetsPage
      runId={run.name}
      runLabel={run.period_label}
      payDate={run.pay_date}
      initial={initial}
    />
  );
}
