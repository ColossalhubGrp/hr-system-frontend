import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, FolderCog } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import { getMyAccess } from "@/lib/frappe/roles";
import { listLeavePolicies } from "@/lib/frappe/leave-policies";
import { listLeaveTypes } from "@/lib/frappe/leave-types";
import { listCompanies } from "@/lib/frappe/lookups";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LeavePoliciesAdmin } from "@/components/settings/leave-policies-admin";

export const metadata = {
  title: "Leave policies · Settings · Colossal HR",
};

/**
 * Admin surface for Leave Policies. A Leave Policy bundles multiple
 * Leave Types with per-year day counts and can be assigned in bulk
 * to every active employee (optionally filtered by company /
 * department), pre-filling the year's Leave Allocations in one go.
 *
 * HR_ADMIN gate for CRUD + bulk-assign; HR_ANY viewers see the
 * table read-only.
 */
export default async function LeavePoliciesPage() {
  await requireGroup("HR_ANY", "/settings/leave-policies");
  const [policies, leaveTypes, companies, access] = await Promise.all([
    listLeavePolicies(),
    listLeaveTypes(),
    listCompanies(),
    getMyAccess(),
  ]);
  const canManage = Boolean(access.isHrAdmin || access.isItAdmin);

  return (
    <div className="flex flex-col gap-5">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit gap-1 text-xs text-muted-foreground"
      >
        <Link href={"/settings" as Route}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to settings
        </Link>
      </Button>

      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FolderCog className="h-3.5 w-3.5" />
          Settings · Leave policies
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Leave policies</h1>
        <p className="text-sm text-muted-foreground">
          {policies.length} polic{policies.length === 1 ? "y" : "ies"}. A
          policy bundles leave types with per-year day counts. Use{" "}
          <b>Assign to employees</b> at the start of a year to pre-fill
          balances for everyone in one go.
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          <LeavePoliciesAdmin
            initial={policies}
            leaveTypeOptions={leaveTypes.map((t) => t.name)}
            companyOptions={companies}
            canManage={canManage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
