import { BookOpen, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts, VOUCHER_TYPES } from "@/lib/frappe/accounting";
import { NewJournalEntryForm } from "@/components/accounting/new-journal-entry-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Journal Entry · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

/**
 * Server component that loads lookups (companies + first-batch accounts)
 * then hands the client form the data it needs. Kept thin so the form
 * component owns all the interactive state (line editor, running totals,
 * balance check).
 */
export default async function NewJournalEntryPage() {
  const companies = await listCompanies();
  const defaultCompany = companies[0]?.name ?? "";
  // Warm the accounts list for the default company so the first render
  // of the account picker has something to show. Subsequent typing hits
  // a per-keystroke search endpoint via the client component.
  const initialAccounts = defaultCompany
    ? await listAccounts(defaultCompany, { limit: 30 })
    : [];

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/journal-entries" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Journal Entries
        </Link>
      </div>
      <PageHeader
        icon={BookOpen}
        crumb="Accounting · Journal Entries · New"
        title="New Journal Entry"
        subtitle="Post a manual debit and credit across two or more accounts."
      />
      <NewJournalEntryForm
        companies={companies}
        initialAccounts={initialAccounts}
        voucherTypes={[...VOUCHER_TYPES]}
        defaultCompany={defaultCompany}
        defaultDate={today}
      />
    </div>
  );
}
