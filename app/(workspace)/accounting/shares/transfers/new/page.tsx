import { ArrowRightLeft, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { listShareholders } from "@/lib/frappe/shares/shareholder";
import { ShareTransferForm } from "@/components/accounting/share-transfer-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Share Transfer · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewShareTransferPage() {
  const [companies, shareholders] = await Promise.all([listCompanies(), listShareholders()]);
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 200 }) : [];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/shares/transfers" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Share Transfers
        </Link>
      </div>
      <PageHeader
        icon={ArrowRightLeft}
        crumb="Accounting · Shares · Transfers · New"
        title="New Share Transfer"
        subtitle="Issue new shares, buy them back, or move between shareholders."
      />
      <ShareTransferForm
        mode="create"
        companies={companies.map((c) => c.name)}
        shareholders={shareholders.map((s) => s.name)}
        accounts={accounts}
        defaultDate={today}
      />
    </div>
  );
}
