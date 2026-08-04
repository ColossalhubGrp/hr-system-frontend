import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, MessageSquareWarning } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import { getMyAccess } from "@/lib/frappe/roles";
import { listGrievanceTypes } from "@/lib/frappe/grievance-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GrievanceTypesAdmin } from "@/components/settings/grievance-types-admin";

export const metadata = {
  title: "Grievance types · Settings · Colossal HR",
};

/**
 * Admin surface for the Grievance Type registry. Full CRUD gated on
 * HR_ADMIN (HR Director / HR Manager / System Manager / IT Admin);
 * read-only for HR_ANY viewers. The Grievance form's type dropdown
 * pulls from this list.
 */
export default async function GrievanceTypesPage() {
  await requireGroup("HR_ANY", "/settings/grievance-types");
  const [types, access] = await Promise.all([
    listGrievanceTypes(),
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
          <MessageSquareWarning className="h-3.5 w-3.5" />
          Settings · Grievance types
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Grievance types
        </h1>
        <p className="text-sm text-muted-foreground">
          {types.length} type{types.length === 1 ? "" : "s"}. The type registry
          feeds the &quot;Grievance type&quot; dropdown on the file-a-grievance
          form.
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          <GrievanceTypesAdmin initial={types} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  );
}
