import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { EmployeeForm } from "@/components/employee/employee-form";
import { getEmployee } from "@/lib/frappe/employees";
import { fetchEmployeeFormOptions } from "@/lib/frappe/employee-write";
import { updateEmployeeAction } from "../../actions";

// Force a fresh Employee fetch on every request — without this,
// Next.js can serve a cached SSR render of the form and HR sees
// stale field values (e.g. an empty Mobile after we've already
// set cell_number via bench).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const emp = await getEmployee(decodeURIComponent(params.id));
  return {
    title: emp ? `Edit ${emp.name} · Colossal HR` : "Edit employee · Colossal HR",
  };
}

export default async function EditEmployeePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string; fix?: string; run?: string };
}) {
  const id = decodeURIComponent(params.id);
  const [emp, options] = await Promise.all([
    getEmployee(id),
    fetchEmployeeFormOptions(),
  ]);
  if (!emp) notFound();

  // When the user landed here from the Payroll "Fix now" banner or
  // the Run Payroll wizard, Back needs to return them to where they
  // came from — the payroll landing or the specific wizard step —
  // not the employee profile or the master-data directory. `?fix=`
  // names the fieldnames the caller flagged as missing so the form
  // can highlight + jump; `?run=` names the pay run when the origin
  // is the wizard.
  const fromPayroll = searchParams.from === "payroll";
  const fromWizard = searchParams.from === "payroll-wizard";
  const wizardRun = (searchParams.run ?? "").trim();
  const backHref = fromWizard && wizardRun
    ? `/payroll/${encodeURIComponent(wizardRun)}/run`
    : fromPayroll
    ? "/payroll"
    : `/employee/${encodeURIComponent(id)}`;
  const backLabel = fromWizard
    ? "Back to Run payroll"
    : fromPayroll
    ? "Back to payroll"
    : `Back to ${emp.name}`;
  const highlightFields = (searchParams.fix ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const boundAction = updateEmployeeAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={backHref as Route}
          className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Pencil className="h-3.5 w-3.5" />
          HR · Employee · Edit
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Edit {emp.name}
        </h1>
        <p className="text-sm text-ash-600">
          {highlightFields.length > 0
            ? "The highlighted fields are the ones Payroll needs — save when you're done."
            : "Only fields you change will be updated."}
        </p>
      </header>

      <EmployeeForm
        mode="edit"
        action={boundAction}
        options={options}
        initial={emp}
        cancelHref={backHref}
        highlightFields={highlightFields}
        fromOrigin={
          fromWizard && wizardRun
            ? `payroll-wizard:${wizardRun}`
            : fromPayroll
            ? "payroll"
            : undefined
        }
      />
    </div>
  );
}
