import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { FileSpreadsheet, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { getJournalTemplate } from "@/lib/frappe/masters/journal-entry-template";
import { JournalTemplateForm } from "@/components/accounting/journal-template-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Journal Entry Template · Colossal HR` };
}

export default async function EditJournalTemplatePage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies] = await Promise.all([getJournalTemplate(name), listCompanies()]);
  if (!doc) notFound();
  const firstCompany = doc.company || companies[0]?.name || "";
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
        crumb={`Accounting · Masters · Journal Entry Templates · ${doc.templateTitle}`}
        title={doc.templateTitle}
        subtitle={`${doc.voucherType}${doc.company ? ` · ${doc.company}` : ""}`}
      />
      <JournalTemplateForm
        mode="edit"
        name={doc.name}
        companies={companies.map((c) => ({ name: c.name }))}
        accounts={accounts}
        initial={{
          templateTitle: doc.templateTitle,
          voucherType: doc.voucherType,
          company: doc.company,
          accounts: doc.accounts.map((a) => ({
            account: a.account,
            debit: String(a.debitInAccountCurrency || ""),
            credit: String(a.creditInAccountCurrency || ""),
            cost_center: a.costCenter ?? "",
          })),
        }}
      />
    </div>
  );
}
