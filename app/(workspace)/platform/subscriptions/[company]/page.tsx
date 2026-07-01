import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCompanySubscription } from "@/lib/subscriptions/server";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { saveSubscriptionAction } from "../actions";

export const metadata = {
  title: "Edit subscription · Admin · Colossal HR",
};

export default async function CompanySubscriptionPage({
  params,
}: {
  params: { company: string };
}) {
  const company = decodeURIComponent(params.company);
  const sub = await getCompanySubscription(company);
  if (!sub.company) notFound();

  const save = saveSubscriptionAction.bind(null, company);

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit gap-1 text-xs text-muted-foreground">
        <Link href={"/platform/subscriptions" as Route}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to subscriptions
        </Link>
      </Button>

      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          Admin · Subscriptions · {company}
        </div>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {company}
          </h1>
          {sub.is_active ? (
            <Badge>Active</Badge>
          ) : (
            <Badge variant="outline">Suspended</Badge>
          )}
          {sub.auto_seeded && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50/60 text-amber-900">
              Auto-seeded (no record yet)
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Tick the apps this company has subscribed to. Save to apply —
          users see the update on their next page load.
        </p>
      </header>

      <SubscriptionForm subscription={sub} action={save} />
    </div>
  );
}
