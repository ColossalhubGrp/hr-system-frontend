import { notFound, redirect } from "next/navigation";
import {
  getPayRun,
  listEmployeesForRun,
  listPreviousRunNetMap,
} from "@/lib/payroll-engine/payruns";
import { RunWizard } from "@/components/payroll/run-wizard";

export const metadata = { title: "Run payroll · Colossal HR" };
export const dynamic = "force-dynamic";

/**
 * Multi-step wizard for processing a pay run — modelled on Rippling's
 * "Run payroll" flow. Only reachable while the run is OPEN; PROCESSED
 * / UPDATED runs kick back to the detail page (which shows the
 * register).
 */
export default async function RunPayrollWizardPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const run = await getPayRun(id);
  if (!run) notFound();
  if (run.status !== "OPEN") {
    redirect(`/payroll/${encodeURIComponent(id)}`);
  }

  const [employees, prev] = await Promise.all([
    listEmployeesForRun(id),
    listPreviousRunNetMap(id),
  ]);

  // Serialize Maps to plain records so they cross the server/client
  // boundary. The wizard reads snapshots by employee id.
  const prevSnapshots: Record<
    string,
    { gross_usd: number; paye_usd: number; nssa_ee_usd: number; net_usd: number }
  > = {};
  for (const [emp, s] of prev.snapshotByEmployee) {
    prevSnapshots[emp] = s;
  }

  return (
    <RunWizard
      runId={run.name}
      runLabel={run.period_label}
      payDate={run.pay_date}
      exchangeRate={run.exchange_rate}
      employees={employees}
      prevLabel={prev.label}
      prevSnapshots={prevSnapshots}
      prevTotalNet={prev.total}
    />
  );
}
