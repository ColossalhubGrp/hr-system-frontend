import Link from "next/link";
import type { Route } from "next";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { listTxnCodes } from "@/lib/payroll-engine/setup";
import { AddRecordModal, EditRecordModal } from "@/components/payroll/setup-modal";
import { DeleteButton } from "@/components/payroll/row-actions";
import {
  addCode,
  updateCodeAction,
  deleteCodeAction,
} from "@/app/(workspace)/payroll/setup/actions";

export const metadata = { title: "Earnings & Deductions · Setup · Payroll" };
export const dynamic = "force-dynamic";

type Kind = "EARNING" | "DEDUCTION";

const SUB_TABS: { label: string; kind: Kind }[] = [
  { label: "Earnings", kind: "EARNING" },
  { label: "Deductions", kind: "DEDUCTION" },
];

export default async function CodesPage({
  searchParams,
}: {
  searchParams: { kind?: string };
}) {
  const active: Kind = searchParams.kind === "DEDUCTION" ? "DEDUCTION" : "EARNING";
  const all = await listTxnCodes();
  const codes = all.filter((c) => c.kind === active);
  const isEarning = active === "EARNING";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            The catalogue of transaction codes used when capturing payroll transactions.
          </p>
        </div>
        <AddRecordModal
          title={`Add ${isEarning ? "earning" : "deduction"}`}
          buttonLabel={`+ Add ${isEarning ? "earning" : "deduction"}`}
          action={addCode}
          fields={[
            {
              name: "code",
              label: "Code name",
              placeholder: isEarning ? "Housing Allowance" : "Salary Advance",
            },
            // Kind preselected by the active sub-tab; user can flip if needed.
            {
              name: "kind",
              label: "Type",
              type: "select",
              options: ["EARNING", "DEDUCTION"],
              defaultValue: active,
            },
            { name: "defaultCurrency", label: "Default currency", type: "select", options: ["USD", "ZWG"] },
            { name: "taxable", label: "Tax treatment", type: "select", options: ["Taxable", "Non-taxable"] },
          ]}
        />
      </header>

      {/* Sub-tab strip — Earnings | Deductions */}
      <div className="flex gap-1 border-b">
        {SUB_TABS.map((t) => {
          const isActive = t.kind === active;
          return (
            <Link
              key={t.kind}
              href={`/payroll/setup/codes?kind=${t.kind}` as Route}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-3 pb-2 pt-1 text-sm font-semibold transition",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className="ml-2 inline-flex items-center rounded-full bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {all.filter((c) => c.kind === t.kind).length}
              </span>
            </Link>
          );
        })}
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Code</TableHead>
              <TableHead className="px-5">Default currency</TableHead>
              <TableHead className="px-5">Tax treatment</TableHead>
              <TableHead className="px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  {isEarning
                    ? "No earnings yet. Add a few (Overtime, Housing Allowance, Acting Allowance) to start capturing transactions."
                    : "No deductions yet. Add a few (Salary Advance, Funeral Policy, Garnishee) to start capturing transactions."}
                </TableCell>
              </TableRow>
            ) : (
              codes.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="px-5 align-middle font-semibold">{c.code}</TableCell>
                  <TableCell className="px-5 align-middle">
                    {c.default_currency === "ZWG" ? "ZiG" : c.default_currency || "—"}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-muted-foreground">
                    {c.kind === "DEDUCTION" ? "—" : c.taxable ? "Taxable" : "Non-taxable"}
                  </TableCell>
                  <TableCell className="px-5 text-right align-middle">
                    <div className="flex justify-end gap-3">
                      <EditRecordModal
                        id={c.name}
                        title="Edit code"
                        action={updateCodeAction}
                        fields={[
                          { name: "code", label: "Code name", defaultValue: c.code },
                          { name: "kind", label: "Type", type: "select", options: ["EARNING", "DEDUCTION"], defaultValue: c.kind },
                          { name: "defaultCurrency", label: "Default currency", type: "select", options: ["USD", "ZWG"], defaultValue: c.default_currency ?? "USD" },
                          { name: "taxable", label: "Tax treatment", type: "select", options: ["Taxable", "Non-taxable"], defaultValue: c.taxable ? "Taxable" : "Non-taxable" },
                        ]}
                      />
                      <DeleteButton
                        id={c.name}
                        confirmText={`Delete ${c.code}?`}
                        action={deleteCodeAction}
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
