import Link from "next/link";
import { SectionBack } from "../../_lib/section-back";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getSubscriptionSettings } from "@/lib/frappe/subscriptions/settings";
import { SubscriptionSettingsForm } from "@/components/accounting/subscription-settings-form";

export const metadata = { title: "Subscription Settings · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function SubscriptionSettingsPage() {
  const initial = await getSubscriptionSettings();
  return (
    <div className="flex flex-col gap-5">
      <SectionBack path="/accounting/subscriptions/settings" />
      <PageHeader
        icon={ScrollText}
        crumb="Accounting · Subscriptions · Settings"
        title="Subscription Settings"
        subtitle="Site-wide grace, auto-cancel and proration for recurring subscriptions."
      />
      <SubscriptionSettingsForm initial={initial} />
    </div>
  );
}
