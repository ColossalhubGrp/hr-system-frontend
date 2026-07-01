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
import { listTaxNotices } from "@/lib/payroll-engine/doctype-helpers";
import { TaxNoticeForm } from "@/components/payroll/tax-notice-form";
import { ActionButton, DeleteButton } from "@/components/payroll/row-actions";
import {
  deleteNoticeAction,
  markFiledNoticeAction,
  markPaidNoticeAction,
} from "@/app/(workspace)/payroll/actions";

export const metadata = { title: "Expected Tax Notices · Payroll · Colossal HR" };

const STATUS_CLS: Record<string, string> = {
  EXPECTED: "bg-slate-100 text-slate-700",
  ACTION_NEEDED: "bg-rose-100 text-rose-700",
  FILED: "bg-blue-100 text-blue-800",
  PAID: "bg-emerald-100 text-emerald-700",
  DISMISSED: "bg-slate-100 text-slate-500",
};

export default async function TaxNoticesTab() {
  const items = await listTaxNotices();
  const open = items.filter((n) => ["EXPECTED", "ACTION_NEEDED"].includes(n.status)).length;
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-foreground">
            Expected Tax Notices
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {open} open filing{open === 1 ? "" : "s"} — the system tracks
            every federal, state and local return.
          </p>
        </div>
        <details className="relative">
          <summary className="list-none cursor-pointer rounded-lg border bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            + Add notice
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-[360px] rounded-lg border bg-card p-4 shadow-lg">
            <TaxNoticeForm />
          </div>
        </details>
      </header>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Agency</TableHead>
              <TableHead className="px-5">Jurisdiction</TableHead>
              <TableHead className="px-5">Form</TableHead>
              <TableHead className="px-5">Period</TableHead>
              <TableHead className="px-5">Due</TableHead>
              <TableHead className="px-5 text-right">Amount</TableHead>
              <TableHead className="px-5">Status</TableHead>
              <TableHead className="px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  No tax notices on file.
                </TableCell>
              </TableRow>
            ) : (
              items.map((n) => (
                <TableRow key={n.name}>
                  <TableCell className="px-5 align-middle font-semibold">{n.agency}</TableCell>
                  <TableCell className="px-5 align-middle">{n.jurisdiction ?? "—"}</TableCell>
                  <TableCell className="px-5 align-middle">{n.form}</TableCell>
                  <TableCell className="px-5 align-middle">{n.period ?? "—"}</TableCell>
                  <TableCell className="px-5 align-middle">{n.due_date ? fmtDate(n.due_date) : "—"}</TableCell>
                  <TableCell className="px-5 text-right align-middle font-semibold">
                    {n.amount ? money(n.amount) : "—"}
                  </TableCell>
                  <TableCell className="px-5 align-middle">
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_CLS[n.status])}>
                      {n.status === "ACTION_NEEDED" ? "Action needed" : n.status[0] + n.status.slice(1).toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 text-right align-middle">
                    <div className="flex justify-end gap-3">
                      {["EXPECTED", "ACTION_NEEDED"].includes(n.status) && (
                        <ActionButton id={n.name} label="Mark filed" action={markFiledNoticeAction} />
                      )}
                      {n.status === "FILED" && (
                        <ActionButton id={n.name} label="Mark paid" action={markPaidNoticeAction} />
                      )}
                      <DeleteButton id={n.name} confirmText="Delete this notice?" action={deleteNoticeAction} />
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

function money(n: number): string {
  return `$${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
