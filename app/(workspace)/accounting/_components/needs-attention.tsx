import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, Clock, FileText, ArrowRight } from "lucide-react";
import type { OverviewData } from "../_lib/overview-data";

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * "Needs attention" panel — single-line alerts a finance operator can
 * burn down. Each row is a Link to the filtered list, so clicking jumps
 * straight into the fix path. Empty list collapses to a one-line
 * "nothing waiting" state rather than taking up a whole card.
 */
export function NeedsAttention({ data }: { data: OverviewData }) {
  const { alerts } = data;
  const rows: {
    key: string;
    tone: "rose" | "amber" | "primary";
    icon: typeof AlertTriangle;
    label: string;
    detail?: string;
    href: string;
  }[] = [];

  if (alerts.overdueInvoices > 0) {
    rows.push({
      key: "overdue",
      tone: "rose",
      icon: AlertTriangle,
      label: `${alerts.overdueInvoices} overdue invoice${alerts.overdueInvoices === 1 ? "" : "s"}`,
      detail: `$${fmtMoney(alerts.overdueAmount)} outstanding`,
      href: "/accounting/sales-invoices?status=Overdue",
    });
  }
  if (alerts.draftInvoices > 0) {
    rows.push({
      key: "draft-si",
      tone: "amber",
      icon: FileText,
      label: `${alerts.draftInvoices} draft sales invoice${alerts.draftInvoices === 1 ? "" : "s"}`,
      detail: "Not yet submitted to the ledger",
      href: "/accounting/sales-invoices?docstatus=0",
    });
  }
  if (alerts.draftBills > 0) {
    rows.push({
      key: "draft-pi",
      tone: "amber",
      icon: FileText,
      label: `${alerts.draftBills} draft purchase invoice${alerts.draftBills === 1 ? "" : "s"}`,
      detail: "Supplier bills waiting for review",
      href: "/accounting/purchase-invoices?docstatus=0",
    });
  }
  if (alerts.openPaymentEntries > 0) {
    rows.push({
      key: "open-pe",
      tone: "primary",
      icon: Clock,
      label: `${alerts.openPaymentEntries} open payment entr${alerts.openPaymentEntries === 1 ? "y" : "ies"}`,
      detail: "Draft payments not yet submitted",
      href: "/accounting/payment-entries?docstatus=0",
    });
  }

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h3 className="text-sm font-bold text-foreground">
          Needs attention
        </h3>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {rows.length > 0 ? `${rows.length} item${rows.length === 1 ? "" : "s"}` : "all clear"}
        </span>
      </header>
      {rows.length === 0 ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Nothing waiting. The ledger is quiet.
        </div>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => {
            const Icon = r.icon;
            const tone =
              r.tone === "rose" ? "text-rose-700 bg-rose-50"
              : r.tone === "amber" ? "text-amber-700 bg-amber-50"
              : "text-primary bg-primary/10";
            return (
              <li key={r.key}>
                <Link
                  href={r.href as Route}
                  className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-muted/30"
                >
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${tone}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{r.label}</div>
                    {r.detail && <div className="text-[11px] text-muted-foreground">{r.detail}</div>}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
