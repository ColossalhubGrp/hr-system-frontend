import { CalendarClock, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { listFiscalYears } from "@/lib/frappe/masters/fiscal-year";
import { NewPeriodClosingForm } from "@/components/accounting/new-period-closing-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Period Closing · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewPeriodClosingPage() {
  const [companies, fys] = await Promise.all([listCompanies(), listFiscalYears()]);
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 200 }) : [];
  const today = new Date().toISOString().slice(0, 10);
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
        crumb="Accounting · Tools · Period Closing · New"
        title="New Period Closing Voucher"
        subtitle="Sweep P&L into the closing account at year-end."
      />
      <NewPeriodClosingForm
        companies={companies.map((c) => c.name)}
        fiscalYears={fys.map((y) => y.name)}
        accounts={accounts}
        defaultDate={today}
      />
    </div>
  );
}
