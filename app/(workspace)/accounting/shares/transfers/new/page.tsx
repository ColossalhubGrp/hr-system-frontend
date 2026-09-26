import { ArrowRightLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { listShareholders } from "@/lib/frappe/shares/shareholder";
import { ShareTransferForm } from "@/components/accounting/share-transfer-form";

export const metadata = { title: "New Share Transfer · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewShareTransferPage() {
  const [companies, shareholders] = await Promise.all([listCompanies(), listShareholders()]);
  const firstCompany = companies[0]?.name ?? "";
  const accounts = firstCompany ? await listAccounts(firstCompany, { limit: 200 }) : [];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-5">
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
