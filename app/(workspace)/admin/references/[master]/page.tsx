import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, Database, Plus, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { describeMaster, listValues, myCompany } from "@/lib/references/server";
import {
  deactivateValueAction,
  upsertValueAction,
} from "../actions";
import { ValueForm } from "@/components/references/value-form";

export const metadata = {
  title: "Reference master · Admin · Colossal HR",
};

type SP = { include_inactive?: string; search?: string };

export default async function ReferenceMasterPage({
  params,
  searchParams,
}: {
  params: { master: string };
  searchParams: SP;
}) {
  const master = decodeURIComponent(params.master);
  const [meta, company] = await Promise.all([
    describeMaster(master),
    myCompany(),
  ]);
  if (!meta) notFound();

  const isCompanyScoped = meta.fields.some((f) => f.fieldname === "company");
  const includeInactive = searchParams.include_inactive === "1";
  const { rows, total } = await listValues(master, {
    includeInactive,
    limitPageLength: 500,
    search: searchParams.search,
    // Auto-scope reads to the user's company so people see only their
    // org's rows. Master rows with company=NULL still show as "shared".
    company: isCompanyScoped ? (company ?? undefined) : undefined,
  });
  const upsert = upsertValueAction.bind(null, master);

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit gap-1 text-xs text-muted-foreground">
        <Link href={"/admin/references" as Route}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to masters
        </Link>
      </Button>

      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Database className="h-3.5 w-3.5" />
          Admin · Reference data · {meta.module}
        </div>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {meta.name}
          </h1>
          <Badge variant="secondary">{total} row{total === 1 ? "" : "s"}</Badge>
        </div>
        {meta.description && (
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Existing rows */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Records
            </h2>
            <Button asChild size="sm" variant="outline">
              <Link
                href={
                  (`/admin/references/${encodeURIComponent(master)}?include_inactive=${includeInactive ? 0 : 1}` as unknown) as Route
                }
              >
                {includeInactive ? "Hide inactive" : "Show inactive"}
              </Link>
            </Button>
          </div>
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-5">Title</TableHead>
                  <TableHead className="px-5">Code</TableHead>
                  <TableHead className="px-5 text-right">Sort</TableHead>
                  <TableHead className="px-5">Status</TableHead>
                  <TableHead className="px-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      No rows yet. Add the first one on the right.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="px-5 align-top font-medium text-foreground">
                        {r.title}
                        {r.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {r.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-5 align-top">
                        {r.code ? (
                          <code className="text-xs text-muted-foreground">{r.code}</code>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 text-right align-top text-muted-foreground">
                        {r.sort_order ?? 0}
                      </TableCell>
                      <TableCell className="px-5 align-top">
                        {r.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-5 text-right align-top">
                        {r.is_active ? (
                          <DeactivateButton master={master} name={r.name} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
          <p className="text-xs text-muted-foreground">
            Deactivated rows stay in the database so existing references to
            them remain valid. They just don't show up in dropdowns.
          </p>
        </section>

        {/* New row form */}
        <aside className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />
            Add a record
          </h2>
          {isCompanyScoped && company && (
            <p className="rounded-md border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              New rows will be scoped to <strong className="text-foreground">{company}</strong>.
            </p>
          )}
          <Card className="p-5">
            <ValueForm
              action={upsert}
              defaultCompany={isCompanyScoped ? (company ?? undefined) : undefined}
            />
          </Card>
        </aside>
      </div>
    </div>
  );
}

function DeactivateButton({ master, name }: { master: string; name: string }) {
  async function action() {
    "use server";
    await deactivateValueAction(master, name);
  }
  return (
    <form action={action} className="inline-flex">
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="border-destructive/30 text-destructive hover:bg-destructive/5"
      >
        <EyeOff className="h-3.5 w-3.5" />
        Deactivate
      </Button>
    </form>
  );
}
