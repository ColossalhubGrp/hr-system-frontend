import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, MapPin } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import { listBranches } from "@/lib/frappe/branches";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateBranchButton } from "@/components/settings/create-branch-button";

export const metadata = {
  title: "Branches · Settings · Colossal HR",
};

/**
 * HR-admin admin for tenant Branches. Lists existing branches + lets
 * an admin create a new one from a modal. Employees can then pick
 * the branch on their edit form (Overview tab).
 */
export default async function BranchesPage() {
  await requireGroup("HR_ADMIN", "/settings/branches");
  const branches = await listBranches();

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

      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            Settings · Branches
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Branches on this tenant
          </h1>
          <p className="text-sm text-muted-foreground">
            {branches.length} branch{branches.length === 1 ? "" : "es"}.
            Employees pick a Branch on their profile — assign one per Employee
            when the business runs from more than a single site.
          </p>
        </div>
        <CreateBranchButton />
      </header>

      <Card>
        <CardHeader className="sr-only">
          <CardTitle>Branch rows</CardTitle>
          <CardDescription>
            Every branch this tenant can assign to an employee.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Weekly labor budget</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No branches yet. Click <b>New branch</b> above.
                  </TableCell>
                </TableRow>
              ) : (
                branches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="align-top font-medium">
                      {b.name}
                    </TableCell>
                    <TableCell className="text-right align-top text-muted-foreground">
                      {b.weeklyLaborBudget > 0
                        ? b.weeklyLaborBudget.toLocaleString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
