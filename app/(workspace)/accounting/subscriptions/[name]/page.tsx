import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Repeat, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { listCompanies } from "@/lib/frappe/accounting";
import { listSubscriptionPlans } from "@/lib/frappe/subscriptions/plan";
import { getSubscription } from "@/lib/frappe/subscriptions/subscription";
import { SubscriptionForm } from "@/components/accounting/subscription-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Subscription · Colossal HR` };
}

export default async function EditSubscriptionPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, companies, plans] = await Promise.all([getSubscription(name), listCompanies(), listSubscriptionPlans()]);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/subscriptions" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Subscriptions
        </Link>
      </div>
      <PageHeader
        icon={Repeat}
        crumb={`Accounting · Subscriptions · ${doc.name}`}
        title={doc.name}
        subtitle={`${doc.partyType}: ${doc.party} · ${doc.company} · ${doc.startDate}`}
        actions={<StatusPill status={doc.status || "—"} />}
      />
      <SubscriptionForm
        mode="edit"
        name={doc.name}
        companies={companies.map((c) => c.name)}
        plans={plans.map((p) => p.name)}
        defaultDate={doc.startDate}
        status={doc.status}
        initial={{
          partyType: doc.partyType,
          party: doc.party,
          company: doc.company,
          startDate: doc.startDate,
          endDate: doc.endDate,
          daysUntilDue: doc.daysUntilDue,
          followCalendarMonths: doc.followCalendarMonths,
          generateNewInvoicesPastDueDate: doc.generateNewInvoicesPastDueDate,
          submitInvoice: doc.submitInvoice,
          generateInvoiceAt: doc.generateInvoiceAt,
          plans: doc.plans.map((p) => ({ plan: p.plan, qty: String(p.qty) })),
        }}
      />
    </div>
  );
}
