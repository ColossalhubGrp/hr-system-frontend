import { FileSpreadsheet, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { JournalTemplateForm } from "@/components/accounting/journal-template-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Journal Entry Template · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewJournalTemplatePage() {
  const companies = await listCompanies();
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 100 }) : [];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/journal-templates" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Journal Entry Templates
        </Link>
      </div>
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
