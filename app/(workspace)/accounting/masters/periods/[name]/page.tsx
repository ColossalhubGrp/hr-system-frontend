import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { getAccountingPeriod } from "@/lib/frappe/masters/accounting-period";
import { AccountingPeriodForm } from "@/components/accounting/accounting-period-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Accounting Period · Colossal HR` };
}

export default async function EditAccountingPeriodPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies] = await Promise.all([getAccountingPeriod(name), listCompanies()]);
  if (!doc) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/periods" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting Periods
        </Link>
      </div>
      <PageHeader
        icon={CalendarClock}
        crumb={`Accounting · Masters · Accounting Periods · ${doc.periodName}`}
        title={doc.periodName}
        subtitle={`${doc.startDate} → ${doc.endDate} · ${doc.company}`}
      />
      <AccountingPeriodForm
        mode="edit"
        name={doc.name}
        companies={companies.map((c) => ({ name: c.name }))}
        initial={{ periodName: doc.periodName, startDate: doc.startDate, endDate: doc.endDate, company: doc.company }}
      />

      {doc.closedDocuments.length > 0 && (
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Closed document types</h2>
          <ul className="grid gap-1 sm:grid-cols-2">
            {doc.closedDocuments.map((cd) => (
              <li key={cd.idx} className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-sm">
                <span className="text-foreground">{cd.documentType}</span>
                <span className={cd.closed ? "font-semibold text-fall" : "text-muted-foreground"}>
                  {cd.closed ? "Closed" : "Open"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
