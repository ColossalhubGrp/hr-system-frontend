import Link from "next/link";
import type { Route } from "next";
import { Database, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { listMasters, listAvailableModules } from "@/lib/references/server";
import { NewMasterDialog } from "@/components/references/new-master-dialog";

export const metadata = { title: "Reference data · Admin · Colossal HR" };

export default async function ReferenceMastersPage() {
  const [masters, modules] = await Promise.all([
    listMasters(),
    listAvailableModules(),
  ]);
  const grouped = groupByModule(masters);
  const totalRows = masters.reduce((s, m) => s + m.rowCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Database}
        crumb="Admin · Reference data"
        title="Reference masters"
        subtitle={
          masters.length === 0
            ? "No masters created yet. The bench-wide framework creates them as Select fields get promoted to Link."
            : `${masters.length} master${masters.length === 1 ? "" : "s"} · ${totalRows.toLocaleString()} total row${totalRows === 1 ? "" : "s"} across the bench.`
        }
        actions={<NewMasterDialog modules={modules} />}
      />

      {masters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Database className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground max-w-md">
              When a hardcoded dropdown gets promoted to admin-managed
              reference data, the resulting master DocType shows up here
              automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([module, items]) => (
          <section key={module} className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {module}
            </h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Master</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((m) => {
                      const href = `/admin/references/${encodeURIComponent(m.name)}` as Route;
                      return (
                        <TableRow key={m.name} className="group">
                          <TableCell className="align-top font-medium">
                            <Link href={href} className="text-foreground hover:underline">
                              {m.name}
                            </Link>
                          </TableCell>
                          <TableCell className="align-top text-muted-foreground">
                            <Link href={href} className="block">
                              {m.description || "—"}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right align-top text-muted-foreground">
                            <Link href={href} className="block">
                              {m.rowCount.toLocaleString()}
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
          </section>
        ))
      )}
    </div>
  );
}

function groupByModule(
  masters: Awaited<ReturnType<typeof listMasters>>,
): Record<string, Awaited<ReturnType<typeof listMasters>>> {
  const out: Record<string, typeof masters> = {};
  for (const m of masters) {
    const k = m.module || "Other";
    (out[k] ??= []).push(m);
  }
  for (const k of Object.keys(out)) {
    out[k]!.sort((a, b) => a.name.localeCompare(b.name));
  }
  return out;
}
