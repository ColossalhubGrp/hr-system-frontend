import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { getPeriodClosing } from "@/lib/frappe/tools/period-closing-voucher";
import { PeriodClosingDetail } from "@/components/accounting/period-closing-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Period Closing · Colossal HR` };
}

export default async function PeriodClosingDetailPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const doc = await getPeriodClosing(name);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/tools/period-close" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Period Closing
        </Link>
      </div>
      <PageHeader
        icon={CalendarClock}
        crumb={`Accounting · Tools · Period Closing · ${doc.name}`}
        title={doc.name}
        subtitle={`${doc.company} · ${doc.fiscalYear} · ${doc.postingDate}`}
        actions={<StatusPill status={doc.docstatus === 0 ? "Draft" : doc.docstatus === 1 ? "Submitted" : "Cancelled"} />}
      />

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Voucher</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Closing account" value={doc.closingAccountHead} />
          <Detail label="Cost centre" value={doc.costCenter ?? "—"} />
          <Detail label="Finance book" value={doc.financeBook ?? "—"} />
          <Detail label="Year start" value={doc.yearStartDate ?? "—"} />
          <Detail label="Year end" value={doc.yearEndDate ?? "—"} />
          <Detail label="Remarks" value={doc.remarks ?? "—"} />
        </div>
      </section>

      <PeriodClosingDetail name={doc.name} docstatus={doc.docstatus} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}
