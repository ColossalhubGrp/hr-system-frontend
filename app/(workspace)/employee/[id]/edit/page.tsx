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
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const [emp, options] = await Promise.all([
    getEmployee(id),
    fetchEmployeeFormOptions(),
  ]);
  if (!emp) notFound();

  const backHref = `/employee/${encodeURIComponent(id)}`;
  // Server Actions can't take extra params via `useFormState` directly, so
  // bind the id here on the server before handing the action to the form.
  const boundAction = updateEmployeeAction.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={backHref as Route}
          className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to {emp.name}
        </Link>
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Pencil className="h-3.5 w-3.5" />
          HR · Employee · Edit
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Edit {emp.name}
        </h1>
        <p className="text-sm text-ash-600">
          Only fields you change will be updated.
        </p>
      </header>

      <EmployeeForm
        mode="edit"
        action={boundAction}
        options={options}
        initial={emp}
        cancelHref={backHref}
      />
    </div>
  );
}
