import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Building2, Plus, Pencil } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import { listCompanies } from "@/lib/frappe/companies";
import { getMyAccess } from "@/lib/frappe/roles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = {
  title: "Company profile · Settings · Colossal HR",
};

/**
 * Pilot conversion to shadcn/ui — same behaviour, same role gating, same
 * data. What changed is purely visual: bespoke `card` + `chip` classes are
 * replaced with the new <Card> / <Table> / <Button> primitives, which read
 * brand colours from the CSS variables in app/globals.css.
 *
 * Side effect: this page is now the reference for the rest of the workspace
 * migration. Anything HR sees here should be replicable across the other
 * ~40 pages using only these primitives.
 */
export default async function CompanySettingsPage() {
  await requireGroup("HR_ADMIN", "/settings/company");
  const [companies, access] = await Promise.all([
    listCompanies(),
    getMyAccess(),
  ]);
  // Write rights are tighter than read — HR Director / IT Admin / SysMgr.
  // The "Edit" pencil + "New company" CTA are hidden for read-only viewers
  // (HR Manager / HR Operations) per the visibility-based security model.
  const canWrite = access.isHrAdmin || access.isItAdmin;

  return (
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" size="sm" className="w-fit gap-1 text-xs text-muted-foreground">
        <Link href={"/settings" as Route}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to settings
        </Link>
      </Button>

      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            Settings · Company profile
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Companies on this tenant
          </h1>
          <p className="text-sm text-muted-foreground">
            {companies.length} company record{companies.length === 1 ? "" : "s"}.
            Currency, country, abbreviation and holiday list flow downstream
            into payroll, attendance and letter generation.
          </p>
        </div>
        {canWrite && (
          <Button asChild className="mt-3 w-fit sm:mt-0">
            <Link href={"/settings/company/new" as Route}>
              <Plus className="h-4 w-4" />
              New company
            </Link>
          </Button>
        )}
      </header>

      <Card>
        <CardHeader className="sr-only">
          <CardTitle>Company list</CardTitle>
          <CardDescription>
            Companies you have read access to.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Abbr</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Holiday list</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No companies yet.{" "}
                    {canWrite && (
                      <>
                        Click{" "}
                        <Link
                          href={"/settings/company/new" as Route}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          New company
                        </Link>{" "}
                        to seed one.
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="align-top font-medium">
                      {canWrite ? (
                        <Link
                          href={`/settings/company/${encodeURIComponent(c.id)}` as Route}
                          className="text-foreground hover:underline"
                        >
                          {c.companyName}
                        </Link>
                      ) : (
                        c.companyName
                      )}
                      <div className="text-xs text-muted-foreground">{c.id}</div>
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {c.abbr ?? "—"}
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {c.country ?? "—"}
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {c.defaultCurrency ?? "—"}
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {c.defaultHolidayList ?? "—"}
                    </TableCell>
                    <TableCell className="text-right align-top">
                      {canWrite && (
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/settings/company/${encodeURIComponent(c.id)}` as Route}
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
