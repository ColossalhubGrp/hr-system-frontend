import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, MapPin } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import { getMyAccess } from "@/lib/frappe/roles";
import { listBranches } from "@/lib/frappe/branches";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BranchesAdmin } from "@/components/settings/branches-admin";

export const metadata = {
  title: "Branches · Settings · Colossal HR",
};

/**
 * HR-admin surface for tenant Branches — full CRUD via the shared
 * BranchesAdmin client component. HR_ANY can view; HR_ADMIN /
 * IT_ADMIN see the New / Edit / Delete controls.
 */
export default async function BranchesPage() {
  await requireGroup("HR_ANY", "/settings/branches");
  const [branches, access] = await Promise.all([
    listBranches(),
    getMyAccess(),
  ]);
  const canManage = Boolean(access.isHrAdmin || access.isItAdmin);
  const initial = branches.map((b) => ({
    name: b.name,
    weeklyLaborBudget: b.weeklyLaborBudget,
  }));

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
          <MapPin className="h-3.5 w-3.5" />
          Settings · Branches
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Branches on this tenant
        </h1>
        <p className="text-sm text-muted-foreground">
          {branches.length} branch{branches.length === 1 ? "" : "es"}. Employees
          pick a Branch on their profile — assign one per Employee when the
          business runs from more than a single site.
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          <BranchesAdmin initial={initial} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  );
}
