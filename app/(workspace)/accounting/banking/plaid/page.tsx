import Link from "next/link";
import { SectionBack } from "../../_lib/section-back";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getPlaidSettings } from "@/lib/frappe/banking/plaid-settings";
import { PlaidForm } from "@/components/accounting/plaid-form";

export const metadata = { title: "Plaid Settings · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function PlaidPage() {
  const initial = await getPlaidSettings();
  return (
    <div className="flex flex-col gap-5">
      <SectionBack path="/accounting/banking/plaid" />
      <PageHeader
        icon={ScrollText}
        crumb="Accounting · Banking · Plaid"
        title="Plaid Settings"
        subtitle="Credentials for linking external US bank accounts via Plaid."
      />
      <PlaidForm initial={initial} />
    </div>
  );
}
