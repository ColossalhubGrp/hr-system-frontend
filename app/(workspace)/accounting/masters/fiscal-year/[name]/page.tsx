import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { getFiscalYear } from "@/lib/frappe/masters/fiscal-year";
import { FiscalYearForm } from "@/components/accounting/fiscal-year-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Fiscal Year · Colossal HR` };
}

export default async function EditFiscalYearPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies] = await Promise.all([getFiscalYear(name), listCompanies()]);
  if (!doc) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/fiscal-year" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Fiscal Year
        </Link>
      </div>
      <PageHeader
        icon={CalendarClock}
        crumb={`Accounting · Masters · Fiscal Year · ${doc.name}`}
        title={doc.name}
        subtitle={`${doc.yearStartDate} → ${doc.yearEndDate}${doc.disabled ? " · Disabled" : ""}`}
      />
      <FiscalYearForm
        mode="edit"
        name={doc.name}
        companies={companies.map((c) => ({ name: c.name }))}
        initial={{
          yearStartDate: doc.yearStartDate,
          yearEndDate: doc.yearEndDate,
          disabled: doc.disabled,
          companies: doc.companies,
        }}
      />
    </div>
  );
}
