import { notFound, redirect } from "next/navigation";
import {
  getPayRun,
  listEmployeesForRun,
  listPreviousRunNetMap,
} from "@/lib/payroll-engine/payruns";
import { listTxnCodes } from "@/lib/payroll-engine/setup";
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

  const [employees, prev, allCodes] = await Promise.all([
    listEmployeesForRun(id),
    listPreviousRunNetMap(id),
    listTxnCodes(),
  ]);

  // Serialize Maps to plain records so they cross the server/client
  // boundary. The wizard reads snapshots by employee id.
  const prevSnapshots: Record<
    string,
    {
      gross_usd: number;
      gross_zig: number;
      paye_usd: number;
      nssa_ee_usd: number;
      net_usd: number;
      net_zig: number;
    }
  > = {};
  for (const [emp, s] of prev.snapshotByEmployee) {
    prevSnapshots[emp] = s;
  }

  // Every USD-earning + USD-deduction code the tenant has defined.
  // Wizard pre-populates one column per code on the Salaried grid —
  // HR always sees the full catalog (Housing, Transport, Bonus,
  // Pension loan, …) even before any transaction is captured.
  // Wizard-dedicated codes (SALARY_ADJUSTMENT etc.) filtered
  // client-side.
  const usdCodes = allCodes.filter(
    (c) => (c.default_currency ?? "USD") === "USD",
  );
  const catalogEarningCodes = usdCodes
    .filter((c) => c.kind === "EARNING")
    .map((c) => c.code);
  const catalogDeductionCodes = usdCodes
    .filter((c) => c.kind === "DEDUCTION")
    .map((c) => c.code);

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
      catalogEarningCodes={catalogEarningCodes}
      catalogDeductionCodes={catalogDeductionCodes}
    />
  );
}
