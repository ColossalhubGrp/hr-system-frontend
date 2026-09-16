import { listActiveEmployees } from "@/lib/payroll-engine/transactions";
import { TerminatePackageForm } from "@/components/payroll/terminate-package-form";

export const metadata = { title: "Terminate employee · Payroll · Colossal HR" };
export const dynamic = "force-dynamic";

/**
 * Termination Package wizard — captures a retrenchment / terminal
 * payout per ZIMRA §14. HR itemizes each amount into the right
 * class (retrenchment-eligible, cash-in-lieu, exempt-passage,
 * regular), sees a live §14 preview, then Approve creates a
 * TERMINAL off-cycle Payroll Run targeted at that one employee.
 */
export default async function TerminatePage({
  searchParams,
}: {
  searchParams: { employee?: string };
}) {
  const employees = await listActiveEmployees();
  return (
    <TerminatePackageForm
      employees={employees}
      initialEmployee={searchParams.employee ?? ""}
    />
  );
}
