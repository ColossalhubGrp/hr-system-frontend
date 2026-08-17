import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import { getMyAccess } from "@/lib/frappe/roles";
import { listLeaveTypes } from "@/lib/frappe/leave-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LeaveTypesAdmin } from "@/components/settings/leave-types-admin";

export const metadata = {
  title: "Leave types · Settings · Colossal HR",
};

/**
 * Admin surface for the Leave Type registry. Full CRUD gated on
 * HR_ADMIN (HR Director / HR Manager / System Manager / IT Admin);
 * read-only for HR_ANY viewers. Filers pick from this list on the
 * leave application form.
 *
 * The `max_leaves_allowed` value set here also drives the
 * auto-provisioned Leave Allocation created by the leave action on
 * the first application of the year (see recruitment_app
 * ensure_leave_allocation).
 */
export default async function LeaveTypesPage() {
  await requireGroup("HR_ANY", "/settings/leave-types");
  const [types, access] = await Promise.all([
    listLeaveTypes(),
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
          <CalendarDays className="h-3.5 w-3.5" />
          Settings · Leave types
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Leave types</h1>
        <p className="text-sm text-muted-foreground">
          {types.length} type{types.length === 1 ? "" : "s"}. Each type has a
          yearly day cap and behaviour flags (earned, carry-forward, unpaid).
          Filers pick from this list on the leave application form.
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          <LeaveTypesAdmin initial={types} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  );
}
