import Link from "next/link";
import type { Route } from "next";
import { ScrollText, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getSubscriptionSettings } from "@/lib/frappe/subscriptions/settings";
import { SubscriptionSettingsForm } from "@/components/accounting/subscription-settings-form";

export const metadata = { title: "Subscription Settings · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function SubscriptionSettingsPage() {
  const initial = await getSubscriptionSettings();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
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
