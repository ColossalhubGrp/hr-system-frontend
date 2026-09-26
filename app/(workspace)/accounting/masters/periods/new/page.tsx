import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { AccountingPeriodForm } from "@/components/accounting/accounting-period-form";

export const metadata = { title: "New Accounting Period · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewAccountingPeriodPage() {
  const companies = await listCompanies();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={CalendarClock}
        crumb="Accounting · Masters · Accounting Periods · New"
        title="New Accounting Period"
        subtitle="Lock a window of dates so nothing new gets posted or edited inside it."
      />
      <AccountingPeriodForm mode="create" companies={companies.map((c) => ({ name: c.name }))} />
    </div>
  );
}
