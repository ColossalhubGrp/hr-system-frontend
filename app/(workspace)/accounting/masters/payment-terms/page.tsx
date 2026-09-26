import Link from "next/link";
import type { Route } from "next";
import { ClipboardList, Plus, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { listPaymentTerms, type PaymentTerm } from "@/lib/frappe/masters/payment-term";

export const metadata = { title: "Payment Terms · Masters · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function PaymentTermsPage() {
  const rows = await listPaymentTerms();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={ClipboardList}
        crumb="Accounting · Masters · Payment Terms"
        title="Payment Terms"
        subtitle={`${rows.length.toLocaleString()} terms — Net 30, Advance 50%, etc. Invoices use these to compute the due date.`}
        actions={
          <Link
            href={"/accounting/masters/payment-terms/new" as Route}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
          >
            <Plus className="h-4 w-4" />
            New term
          </Link>
        }
      />

      <DataTable<PaymentTerm>
        rows={rows}
        rowKey={(r) => r.name}
        rowHref={(r) => `/accounting/masters/payment-terms/${encodeURIComponent(r.name)}`}
        empty={
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No payment terms yet.</p>
          </div>
        }
        columns={[
          { header: "Name", cell: (r) => <span className="font-semibold text-foreground">{r.paymentTermName}</span> },
          { header: "Portion", cell: (r) => `${r.invoicePortion.toFixed(0)}%`, className: "text-right tabular-nums" },
          { header: "Credit", cell: (r) => `${r.creditDays}d + ${r.creditMonths}m` },
          { header: "Due basis", cell: (r) => r.dueDateBasedOn, className: "hidden md:table-cell" },
          {
            header: "Discount",
            cell: (r) => (r.discount ? `${r.discount}${r.discountType === "Percentage" ? "%" : ""}` : "—"),
            className: "text-right tabular-nums",
          },
        ]}
      />
    </div>
  );
}
