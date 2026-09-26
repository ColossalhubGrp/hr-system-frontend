import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies } from "@/lib/frappe/accounting";
import { FiscalYearForm } from "@/components/accounting/fiscal-year-form";

export const metadata = { title: "New Fiscal Year · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewFiscalYearPage() {
  const companies = await listCompanies();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={CalendarClock}
        crumb="Accounting · Masters · Fiscal Year · New"
        title="New Fiscal Year"
        subtitle="Set the accounting calendar for this year — reports and opening balances flow from these dates."
      />
      <FiscalYearForm mode="create" companies={companies.map((c) => ({ name: c.name }))} />
    </div>
  );
}
