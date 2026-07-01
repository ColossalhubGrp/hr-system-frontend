import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import {
  getEmployeeNameMap,
  listTaxExemptions,
} from "@/lib/payroll-engine/doctype-helpers";
import { TaxExemptionForm } from "@/components/payroll/tax-exemption-form";
import { ActionButton, DeleteButton } from "@/components/payroll/row-actions";
import {
  deleteExemptionAction,
  toggleExemptionAction,
} from "@/app/(workspace)/payroll/actions";

export const metadata = { title: "Tax Exemptions · Payroll · Colossal HR" };

export default async function TaxExemptionsTab() {
  const [items, nameMap] = await Promise.all([
    listTaxExemptions(),
    getEmployeeNameMap(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-foreground">
            Tax Exemptions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Company- and employee-level exemptions that change how taxes
            are withheld and filed.
          </p>
        </div>
        <details className="relative">
          <summary className="list-none cursor-pointer rounded-lg border bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            + Add exemption
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-[360px] rounded-lg border bg-card p-4 shadow-lg">
            <TaxExemptionForm />
          </div>
        </details>
      </header>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Scope</TableHead>
              <TableHead className="px-5">Applies to</TableHead>
              <TableHead className="px-5">Tax type</TableHead>
              <TableHead className="px-5">Reason</TableHead>
              <TableHead className="px-5">Status</TableHead>
              <TableHead className="px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No exemptions configured.
                </TableCell>
              </TableRow>
            ) : (
              items.map((x) => (
                <TableRow key={x.name}>
                  <TableCell className="px-5 align-middle">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                        x.scope === "COMPANY"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-700",
                      )}
                    >
                      {x.scope === "COMPANY" ? "Company" : "Employee"}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 align-middle font-semibold">
                    {x.employee ? (nameMap[x.employee] ?? x.employee) : "Whole company"}
                  </TableCell>
                  <TableCell className="px-5 align-middle font-mono text-sm">
                    {x.tax_type}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-muted-foreground">
                    {x.reason}
                  </TableCell>
                  <TableCell className="px-5 align-middle">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                        x.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {x.active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 text-right align-middle">
                    <div className="flex justify-end gap-3">
                      <ActionButton
                        id={x.name}
                        label={x.active ? "Deactivate" : "Activate"}
                        action={toggleExemptionAction}
                      />
                      <DeleteButton
                        id={x.name}
                        confirmText="Delete this exemption?"
                        action={deleteExemptionAction}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
