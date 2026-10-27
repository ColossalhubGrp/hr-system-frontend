import { BookOpen, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts, VOUCHER_TYPES } from "@/lib/frappe/accounting";
import {
  listJournalTemplates,
  getJournalTemplate,
} from "@/lib/frappe/masters/journal-entry-template";
import {
  NewJournalEntryForm,
  type JournalTemplatePrefill,
} from "@/components/accounting/new-journal-entry-form";
import { AccountingSetupGate } from "@/components/accounting/setup-gate";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Journal Entry · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewJournalEntryPage() {
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
      <AccountingSetupGate>
        <NewJournalEntryFormWrapper />
      </AccountingSetupGate>
    </div>
  );
}

/**
 * Server component that loads lookups (companies + first-batch accounts)
 * then hands the client form the data it needs. Kept thin so the form
 * component owns all the interactive state (line editor, running totals,
 * balance check).
 */
async function NewJournalEntryFormWrapper() {
  const companies = await listCompanies();
  const defaultCompany = companies[0]?.name ?? "";
  const initialAccounts = defaultCompany
    ? await listAccounts(defaultCompany, { limit: 30 })
    : [];
  const today = new Date().toISOString().slice(0, 10);
  const templates = await loadTemplatePrefills();
  return (
    <NewJournalEntryForm
      companies={companies}
      initialAccounts={initialAccounts}
      voucherTypes={[...VOUCHER_TYPES]}
      defaultCompany={defaultCompany}
      defaultDate={today}
      templates={templates}
    />
  );
}

/** Saved Journal Entry Templates, flattened into one-click prefills.
 *  A failure here (e.g. permissions) must never block posting a manual
 *  entry — the picker just doesn't render. */
async function loadTemplatePrefills(): Promise<JournalTemplatePrefill[]> {
  try {
    const rows = await listJournalTemplates();
    const details = await Promise.all(rows.map((t) => getJournalTemplate(t.name)));
    return details
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .map((t) => ({
        name: t.name,
        title: t.templateTitle,
        voucherType: t.voucherType,
        company: t.company,
        lines: t.accounts.map((a) => ({
          account: a.account,
          debit: a.debitInAccountCurrency,
          credit: a.creditInAccountCurrency,
          costCenter: a.costCenter,
        })),
      }));
  } catch {
    return [];
  }
}
