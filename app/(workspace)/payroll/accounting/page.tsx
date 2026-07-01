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
import { listGLMappings } from "@/lib/payroll-engine/doctype-helpers";
import { GLMappingForm } from "@/components/payroll/gl-mapping-form";

export const metadata = { title: "Accounting · Payroll · Colossal HR" };

const REQUIRED_CATEGORIES = [
  "Wages Expense",
  "Employer Taxes",
  "Cash",
  "Tax Liabilities",
  "401(k) Payable",
  "Garnishments Payable",
  "Reimbursements Payable",
];

export default async function AccountingTab() {
  const rows = await listGLMappings();
  const mapped = new Set(rows.map((r) => r.category));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-foreground">
            Accounting
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Maps each payroll line-category to a node in the chart of
            accounts — {mapped.size}/{REQUIRED_CATEGORIES.length} mapped.
            When a pay run is paid, the journal entry posts to the
            accounts you pick here.
          </p>
        </div>
        <details className="relative">
          <summary className="list-none cursor-pointer rounded-lg border bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            + Set / update mapping
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-[360px] rounded-lg border bg-card p-4 shadow-lg">
            <GLMappingForm categories={REQUIRED_CATEGORIES} />
          </div>
        </details>
      </header>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Category</TableHead>
              <TableHead className="px-5">GL account</TableHead>
              <TableHead className="px-5">Notes</TableHead>
              <TableHead className="px-5">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {REQUIRED_CATEGORIES.map((cat) => {
              const m = rows.find((r) => r.category === cat);
              return (
                <TableRow key={cat}>
                  <TableCell className="px-5 align-middle font-semibold">{cat}</TableCell>
                  <TableCell className="px-5 align-middle">
                    {m ? (
                      <code className="rounded bg-muted/40 px-1.5 py-0.5 text-xs">{m.account}</code>
                    ) : (
                      <span className="text-xs text-muted-foreground">unmapped</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-xs text-muted-foreground">
                    {m?.notes ?? "—"}
                  </TableCell>
                  <TableCell className="px-5 align-middle">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                        m ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800",
                      )}
                    >
                      {m ? "Mapped" : "Pending"}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
