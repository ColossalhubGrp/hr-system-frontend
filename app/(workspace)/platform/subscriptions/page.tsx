import Link from "next/link";
import type { Route } from "next";
import { Package, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { listApps, listSubscriptions } from "@/lib/subscriptions/server";

export const metadata = {
  title: "Subscriptions · Admin · Colossal HR",
};

export default async function SubscriptionsPage() {
  const [apps, subs] = await Promise.all([listApps(), listSubscriptions()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Package}
        crumb="Admin · Subscriptions"
        title="Company subscriptions"
        subtitle={`${subs.length} compan${subs.length === 1 ? "y" : "ies"} on this bench · ${apps.length} apps in the catalog.`}
      />

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Company</TableHead>
              <TableHead className="px-5">Plan</TableHead>
              <TableHead className="px-5 text-right">Apps enabled</TableHead>
              <TableHead className="px-5">Status</TableHead>
              <TableHead className="px-5">Valid until</TableHead>
              <TableHead className="px-5 text-right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No companies on this site yet.
                </TableCell>
              </TableRow>
            ) : (
              subs.map((s) => (
                <TableRow key={s.company}>
                  <TableCell className="px-5 align-top">
                    <Link
                      href={`/platform/subscriptions/${encodeURIComponent(s.company)}` as Route}
                      className="font-medium text-foreground hover:underline"
                    >
                      {s.company}
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 align-top">
                    {s.plan_name ? (
                      <Badge variant="secondary">{s.plan_name}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {s.auto_seeded && (
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-amber-600">
                        Auto-seeded
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="px-5 text-right align-top">
                    <span className="font-medium">{s.apps_enabled}</span>
                    <span className="text-muted-foreground"> / {s.apps_total}</span>
                  </TableCell>
                  <TableCell className="px-5 align-top">
                    {s.is_active ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="outline">Suspended</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-5 align-top text-xs text-muted-foreground">
                    {s.valid_until ?? "—"}
                  </TableCell>
                  <TableCell className="px-5 text-right align-top">
                    <Link
                      href={`/platform/subscriptions/${encodeURIComponent(s.company)}` as Route}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Edit
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
