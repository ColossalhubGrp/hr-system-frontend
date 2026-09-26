import { FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { JournalTemplateForm } from "@/components/accounting/journal-template-form";

export const metadata = { title: "New Journal Entry Template · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewJournalTemplatePage() {
  const companies = await listCompanies();
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 100 }) : [];
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={FileSpreadsheet}
        crumb="Accounting · Masters · Journal Entry Templates · New"
        title="New Journal Entry Template"
        subtitle="Save the accounts layout for a recurring journal entry."
      />
      <JournalTemplateForm mode="create" companies={companies.map((c) => ({ name: c.name }))} accounts={accounts} />
    </div>
  );
}
