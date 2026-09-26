import Link from "next/link";
import type { Route } from "next";
import { FileInput, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { OpeningInvoiceForm } from "@/components/accounting/opening-invoice-form";

export const metadata = { title: "Opening Invoice Creation Tool · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function OpeningInvoicesPage() {
  const companies = await listCompanies();
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 200 }) : [];
  // Filter to accounts likely to be temporary opening accounts.
  const opening = accounts.filter((a) => /opening|temporary|balance/i.test(a.accountName));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={FileInput}
        crumb="Accounting · Tools · Opening Invoices"
        title="Opening Invoice Creation Tool"
        subtitle="Seed customer / supplier balances on cut-over by bulk-creating opening invoices."
      />
      <OpeningInvoiceForm
        companies={companies.map((c) => c.name)}
        openingAccounts={opening.length > 0 ? opening : accounts}
        defaultDate={today}
      />
    </div>
  );
}
