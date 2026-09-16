import { listActiveEmployees } from "@/lib/payroll-engine/transactions";
import { listTxnCodes } from "@/lib/payroll-engine/setup";
import { frappeCall } from "@/lib/frappe/client";
import { myCompany } from "@/lib/references/server";
import { TerminatePackageForm } from "@/components/payroll/terminate-package-form";

/**
 * Read the tenant's live ZIMRA §14 knobs off Company Payroll
 * Settings so the Termination Package page shows the current
 * values in its subtitle (not the statutory defaults hardcoded
 * from a previous session). Falls back to defaults if the row
 * doesn't exist yet.
 */
async function loadRetrenchThresholds(): Promise<{
  floor: number;
  cap: number;
  fraction: number;
}> {
  try {
    const company = await myCompany();
    if (!company) throw new Error("no company");
    const cps = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      args: { doctype: "Company Payroll Settings", name: company },
      as: "user",
    });
    const num = (k: string) => Number(cps[k] ?? 0);
    return {
      floor: num("retrench_floor_usd") || 3200,
      cap: num("retrench_cap_usd") || 15100,
      fraction: num("retrench_exempt_fraction") || 1 / 3,
    };
  } catch {
    return { floor: 3200, cap: 15100, fraction: 1 / 3 };
  }
}

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
  const [employees, allCodes, thresholds] = await Promise.all([
    listActiveEmployees(),
    listTxnCodes(),
    loadRetrenchThresholds(),
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
      thresholds={thresholds}
    />
  );
}
