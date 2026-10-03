import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { BookOpen, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import {
  getJournalEntry,
  listCompanies,
  listAccounts,
  VOUCHER_TYPES,
} from "@/lib/frappe/accounting";
import { NewJournalEntryForm } from "@/components/accounting/new-journal-entry-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return {
    title: `Edit ${decodeURIComponent(params.name)} · Journal Entry · Colossal HR`,
  };
}

/**
 * Draft-only edit page. Submitted or Cancelled vouchers bounce back
 * to detail — docstatus is the single edit gate (see memory
 * draft-docs-editable). Hydrates the New form with the voucher's
 * current state and swaps it to update mode.
 */
export default async function EditJournalEntryPage({
  params,
}: {
  params: { name: string };
}) {
  const name = decodeURIComponent(params.name);
  const doc = await getJournalEntry(name);
  if (!doc) notFound();
  if (doc.docstatus !== 0) {
    redirect(`/accounting/journal-entries/${encodeURIComponent(name)}`);
  }

  const companies = await listCompanies();
  const accounts = await listAccounts(doc.company, { limit: 100 });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/accounting/journal-entries/${encodeURIComponent(name)}` as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to {name}
        </Link>
      </div>
      <PageHeader
        icon={BookOpen}
        crumb={`Accounting · Journal Entries · ${name} · Edit`}
        title={`Edit ${name}`}
        subtitle="Change anything you need; totals must balance to save."
      />
      <NewJournalEntryForm
        companies={companies}
        initialAccounts={accounts}
        voucherTypes={[...VOUCHER_TYPES]}
        defaultCompany={doc.company}
        defaultDate={doc.postingDate}
        initial={{
          name: doc.name,
          voucherType: doc.voucherType,
          postingDate: doc.postingDate,
          company: doc.company,
          chequeNo: doc.chequeNo,
          chequeDate: doc.chequeDate,
          userRemark: doc.userRemark,
          multiCurrency: doc.multiCurrency,
          lines: doc.accounts.map((l) => ({
            account: l.account,
            debit: l.debitInAccountCurrency,
            credit: l.creditInAccountCurrency,
            costCenter: l.costCenter,
            userRemark: l.userRemark,
            exchangeRate: l.exchangeRate,
          })),
        }}
      />
    </div>
  );
}
