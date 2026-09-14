import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { EmployeeForm } from "@/components/employee/employee-form";
import { getEmployee } from "@/lib/frappe/employees";
import { fetchEmployeeFormOptions } from "@/lib/frappe/employee-write";
import { updateEmployeeAction } from "../../actions";

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
  searchParams: { from?: string; fix?: string };
}) {
  const id = decodeURIComponent(params.id);
  const [emp, options] = await Promise.all([
    getEmployee(id),
    fetchEmployeeFormOptions(),
  ]);
  if (!emp) notFound();

  // When the user landed here from the Payroll "Fix now" banner, we
  // want Back to return them to /payroll (not to the employee profile
  // or the master-data directory). ?fix= names the fieldnames the
  // banner flagged as missing so the form can highlight + jump.
  const fromPayroll = searchParams.from === "payroll";
  const backHref = fromPayroll
    ? "/payroll"
    : `/employee/${encodeURIComponent(id)}`;
  const backLabel = fromPayroll ? "Back to payroll" : `Back to ${emp.name}`;
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
        fromOrigin={fromPayroll ? "payroll" : undefined}
      />
    </div>
  );
}
