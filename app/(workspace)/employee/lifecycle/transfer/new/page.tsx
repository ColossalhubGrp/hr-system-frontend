import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight, GitBranch } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TRANSFER_TYPES } from "@/lib/frappe/transfer-types";

export const metadata = {
  title: "Pick transfer type · Colossal HR",
};

/**
 * Step 1 of the typed transfer flow: HR picks WHICH Employee field is
 * changing. Table row per type; clicking anywhere on a row leads to
 * /transfer/new/<slug> where the tailored form lives.
 */
export default function NewTransferTypePickerPage() {
  const types = Object.values(TRANSFER_TYPES);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/employee/lifecycle/transfer" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to transfer
      </Link>

      <PageHeader
        icon={GitBranch}
        crumb="Employee · Lifecycle · New transfer"
        title="What kind of transfer?"
        subtitle="Each type changes one Employee field. Pick the one that fits — the next step captures the target value."
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t) => {
                const Icon = t.icon;
                const href = `/employee/lifecycle/transfer/new/${t.slug}` as Route;
                return (
                  <TableRow key={t.slug} className="group">
                    <TableCell className="align-top font-medium">
                      <Link
                        href={href}
                        className="flex items-center gap-2 text-foreground hover:underline"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        {t.label}
                      </Link>
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      <Link href={href} className="block">
                        {t.description}
                      </Link>
                    </TableCell>
                    <TableCell className="align-top">
                      <Link href={href} className="block">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                          {t.employeeField}
                        </code>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <Link
                        href={href}
                        className="inline-flex text-muted-foreground group-hover:text-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
