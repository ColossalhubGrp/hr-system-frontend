import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, UserRoundPlus } from "lucide-react";
import { EmployeeForm } from "@/components/employee/employee-form";
import { fetchEmployeeFormOptions } from "@/lib/frappe/employee-write";
import { requireGroup } from "@/lib/frappe/require-role";
import { getMyAccess, PERSONA_ROLES } from "@/lib/frappe/roles";
import { createEmployeeAction } from "../actions";

export const metadata = { title: "New employee · Colossal HR" };

export default async function NewEmployeePage() {
  // Creating an Employee is HR-only.
  await requireGroup("HR_ANY", "/employee/new");
  const [options, access] = await Promise.all([
    fetchEmployeeFormOptions(),
    getMyAccess(),
  ]);
  // Only admins can assign persona roles — mirrors the gate on
  // recruitment_app.api.me.set_login_roles_for_employee. Non-admin
  // HR still creates the Employee (they always land with the
  // Employee self-service role); the picker just isn't shown.
  const canAssignRoles = Boolean(access?.isItAdmin || access?.isHrAdmin);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={"/employee" as Route}
          className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to directory
        </Link>
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <UserRoundPlus className="h-3.5 w-3.5" />
          Employee · New
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Add a new employee
        </h1>
        <p className="text-sm text-ash-600">
          Required fields are marked with <span className="text-fall">*</span>.
          You can flesh out the rest later from the profile page.
        </p>
      </header>

      <EmployeeForm
        mode="create"
        action={createEmployeeAction}
        options={options}
        personaRoles={PERSONA_ROLES}
        canAssignRoles={canAssignRoles}
        cancelHref="/employee"
      />
    </div>
  );
}
