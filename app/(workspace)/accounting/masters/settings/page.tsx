import Link from "next/link";
import { SectionBack } from "../../_lib/section-back";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getAccountsSettings } from "@/lib/frappe/masters/accounts-settings";
import { AccountsSettingsForm } from "@/components/accounting/accounts-settings-form";

export const metadata = { title: "Accounts Settings · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function AccountsSettingsPage() {
  const initial = await getAccountsSettings();
  return (
    <div className="flex flex-col gap-5">
      <SectionBack path="/accounting/masters/settings" />
      <PageHeader
        icon={ScrollText}
        crumb="Accounting · Masters · Accounts Settings"
        title="Accounts Settings"
        subtitle="Site-wide switches: perpetual inventory, credit control, cancellation policy, deferred revenue, print options."
      />
      <AccountsSettingsForm initial={initial} />
    </div>
  );
}
