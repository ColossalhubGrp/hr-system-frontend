import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Layers, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getCustomerGroup, listCustomerGroups } from "@/lib/frappe/sales/customer-group";
import { CustomerGroupForm } from "@/components/sales/customer-group-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Customer Group · Colossal HR` };
}

export default async function EditCustomerGroupPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, all] = await Promise.all([getCustomerGroup(name), listCustomerGroups()]);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/sales/customer-groups" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Customer Groups
        </Link>
      </div>
      <PageHeader icon={Layers} crumb={`Sales · Customer Groups · ${doc.customerGroupName}`} title={doc.customerGroupName} subtitle={doc.isGroup ? "Container group" : "Leaf group"} />
      <CustomerGroupForm
        mode="edit"
        name={doc.name}
        parents={all.filter((p) => p.isGroup && p.name !== doc.name).map((p) => p.name)}
        initial={doc}
      />
    </div>
  );
}
