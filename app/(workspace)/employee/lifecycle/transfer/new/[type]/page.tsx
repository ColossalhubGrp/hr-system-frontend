import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, GitBranch } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { fetchEmployeeFormOptions } from "@/lib/frappe/employee-write";
import {
  TRANSFER_TYPES,
  isTransferTypeSlug,
  type TransferOptionSource,
} from "@/lib/frappe/transfer-types";
import { TypedTransferForm } from "@/components/lifecycle/typed-transfer-form";

export async function generateMetadata({
  params,
}: {
  params: { type: string };
}) {
  if (!isTransferTypeSlug(params.type))
    return { title: "New transfer · Colossal HR" };
  return {
    title: `${TRANSFER_TYPES[params.type].label} · Colossal HR`,
  };
}

/**
 * Step 2 of the typed transfer flow: HR picks the employee, target date,
 * and the new value for THIS type's field. Server component fetches the
 * options once and hands them to the client form so the SelectInput
 * dropdown is populated on first render.
 */
export default async function NewTypedTransferPage({
  params,
  searchParams,
}: {
  params: { type: string };
  searchParams: { employee?: string };
}) {
  if (!isTransferTypeSlug(params.type)) notFound();
  const type = TRANSFER_TYPES[params.type];
  const opts = await fetchEmployeeFormOptions();

  // Resolve the new-value option list for this type. `employees` comes
  // from the employeeDirectory (name + id); everything else is a string[]
  // already on EmployeeFormOptions.
  const newValueOptions = pickOptions(type.optionsSource, opts);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/employee/lifecycle/transfer/new" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Change transfer type
      </Link>

      <PageHeader
        icon={GitBranch}
        crumb={`Employee · Lifecycle · New transfer · ${type.label}`}
        title={type.label}
        subtitle={type.description}
      />

      <TypedTransferForm
        type={type}
        employeeDirectory={opts.employeeDirectory}
        defaultEmployee={searchParams.employee}
        newValueOptions={newValueOptions}
        cancelHref="/employee/lifecycle/transfer/new"
      />
    </div>
  );
}

function pickOptions(
  source: TransferOptionSource,
  opts: Awaited<ReturnType<typeof fetchEmployeeFormOptions>>,
): Array<{ value: string; label: string }> {
  if (source === "employees") {
    return opts.employeeDirectory.map((e) => ({
      value: e.id,
      label: `${e.employee_name} (${e.id})`,
    }));
  }
  const list: string[] = (opts as Record<string, unknown>)[source] as string[];
  return (list ?? []).map((v) => ({ value: v, label: v }));
}
