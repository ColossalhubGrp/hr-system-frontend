import { listActiveEmployees } from "@/lib/payroll-engine/transactions";
import { listTxnCodes } from "@/lib/payroll-engine/setup";
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
  const [employees, allCodes] = await Promise.all([
    listActiveEmployees(),
    listTxnCodes(),
  ]);

  // Only earning-side codes make sense for a termination payout —
  // and only ones the operator has classified. Group by class so
  // the form's Code dropdown filters to what's valid for the
  // selected class.
  const packageCodes = allCodes
    .filter((c) => c.kind === "EARNING")
    .map((c) => ({
      code: c.code,
      package_class: (c.package_class ?? "regular") as
        | "regular"
        | "retrenchment_eligible"
        | "cash_in_lieu"
        | "exempt_passage",
    }));

  return (
    <TerminatePackageForm
      employees={employees}
      initialEmployee={searchParams.employee ?? ""}
      codes={packageCodes}
    />
  );
}
