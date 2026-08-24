import Link from "next/link";
import type { Route } from "next";
import { Building, ChevronLeft } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import { getMyAccess } from "@/lib/frappe/roles";
import { listCompanies } from "@/lib/frappe/companies";
import { listEmployeeDirectory } from "@/lib/frappe/employee-write";
import {
  listDepartmentsAdmin,
  listParentDepartmentOptions,
} from "@/lib/frappe/departments-admin";
import { DepartmentsAdmin } from "@/components/settings/departments-admin";

export const metadata = { title: "Departments · Settings · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function DepartmentsSettingsPage() {
  // Same gate as the backend: HR Director / IT Admin. HR Officer /
  // HR User land on /forbidden if they type the URL directly.
  await requireGroup("HR_ADMIN", "/settings/departments");
  const [access, departments, companies, parents, directory] =
    await Promise.all([
      getMyAccess(),
      listDepartmentsAdmin(),
      listCompanies(),
      listParentDepartmentOptions(),
      listEmployeeDirectory(),
    ]);
  const canManage = Boolean(access?.isHrAdmin || access?.isItAdmin);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to settings
      </Link>

      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Building className="h-3.5 w-3.5" />
          Settings · Departments
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Departments
        </h1>
        <p className="text-sm text-ash-600">
          Group employees, set the fallback approvers each department
          inherits when an employee&apos;s own approver fields are left
          blank. Approvers pick from the full employee directory — the
          system provisions a login for them if they don&apos;t have one
          yet.
        </p>
      </header>

      <DepartmentsAdmin
        initial={departments}
        companies={companies.map((c) => ({
          name: c.id,
          label: c.companyName ?? c.id,
        }))}
        parents={parents}
        directory={directory}
        canManage={canManage}
      />
    </div>
  );
}
