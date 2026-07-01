import Link from "next/link";
import type { Route } from "next";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import {
  listOpenPayRun,
  listTransactionsForRun,
  listActiveEmployees,
} from "@/lib/payroll-engine/transactions";
import { listTxnCodes } from "@/lib/payroll-engine/setup";
import { CaptureTransactionForm } from "@/components/payroll/capture-transaction-form";
import { DeleteButton } from "@/components/payroll/row-actions";
import { deleteTransaction } from "./actions";

export const metadata = { title: "Transactions · Payroll · Colossal HR" };
export const dynamic = "force-dynamic";

const usd = (n: number) =>
  `$${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const zig = (n: number) =>
  `ZiG ${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function TransactionsPage() {
  const open = await listOpenPayRun();

  if (!open) {
    return (
      <div className="flex flex-col gap-5">
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture variable earnings &amp; deductions.
          </p>
        </header>
        <Card className="px-6 py-16 text-center text-sm text-muted-foreground">
          No open pay period.{" "}
          <Link
            href={"/payroll/new" as Route}
            className="font-semibold text-primary hover:underline"
          >
            Create one →
          </Link>
        </Card>
      </div>
    );
  }

  const [txns, employees, codes] = await Promise.all([
    listTransactionsForRun(open.name),
    listActiveEmployees(),
    listTxnCodes(),
  ]);
  const codeOptions = codes.map((c) => ({
    code: c.code,
    kind: c.kind,
    default_currency: c.default_currency ?? "USD",
    taxable: Boolean(c.taxable),
  }));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Variable earnings &amp; deductions for{" "}
            <span className="font-semibold text-foreground">{open.label}</span>{" "}
            (open) — applied when you process.
          </p>
        </div>
        <CaptureTransactionForm
          periodId={open.name}
          employees={employees}
          codes={codeOptions}
        />
      </header>

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Employee</TableHead>
              <TableHead className="px-5">Type</TableHead>
              <TableHead className="px-5">Code</TableHead>
              <TableHead className="px-5">Tax</TableHead>
              <TableHead className="px-5 text-right">Amount</TableHead>
              <TableHead className="px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {txns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No transactions captured for {open.label}.
                </TableCell>
              </TableRow>
            ) : (
              txns.map((t) => (
                <TableRow key={t.name}>
                  <TableCell className="px-5 align-middle font-semibold">
                    {t.employee_name}
                  </TableCell>
                  <TableCell className="px-5 align-middle">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        t.kind === "EARNING"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700",
                      )}
                    >
                      {t.kind === "EARNING" ? "Earning" : "Deduction"}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 align-middle">{t.code}</TableCell>
                  <TableCell className="px-5 align-middle text-muted-foreground">
                    {t.taxable ? "Taxable" : "Non-taxable"}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-right font-semibold">
                    {t.currency === "USD" ? usd(t.amount) : zig(t.amount)}
                  </TableCell>
                  <TableCell className="px-5 align-middle text-right">
                    <DeleteButton
                      id={t.name}
                      action={deleteTransaction}
                      confirmText="Delete this transaction?"
                      successMessage="Transaction deleted."
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex justify-end">
        <Link
          href={`/payroll/${encodeURIComponent(open.name)}` as Route}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Go to {open.label} pay run →
        </Link>
      </div>
    </div>
  );
}
