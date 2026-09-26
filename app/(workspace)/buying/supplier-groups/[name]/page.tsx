import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Layers, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getSupplierGroup, listSupplierGroups } from "@/lib/frappe/buying/supplier-group";
import { SupplierGroupForm } from "@/components/buying/supplier-group-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Supplier Group · Colossal HR` };
}

export default async function EditSupplierGroupPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const [doc, all] = await Promise.all([getSupplierGroup(name), listSupplierGroups()]);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/buying/supplier-groups" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Supplier Groups
        </Link>
      </div>
      <PageHeader icon={Layers} crumb={`Buying · Supplier Groups · ${doc.supplierGroupName}`} title={doc.supplierGroupName} subtitle={doc.isGroup ? "Container group" : "Leaf group"} />
      <SupplierGroupForm
        mode="edit"
        name={doc.name}
        parents={all.filter((p) => p.isGroup && p.name !== doc.name).map((p) => p.name)}
        initial={doc}
      />
    </div>
  );
}
