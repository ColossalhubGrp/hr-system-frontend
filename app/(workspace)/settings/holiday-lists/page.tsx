import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, CalendarDays } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import { listHolidayLists } from "@/lib/frappe/holiday-lists";
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
import { CreateHolidayListButton } from "@/components/settings/create-holiday-list-button";

export const metadata = {
  title: "Holiday lists · Settings · Colossal HR",
};

/**
 * HR-admin admin for tenant Holiday Lists. Lists existing lists +
 * lets an admin create a new one (name, date range, weekly off) from
 * a modal. Individual holiday dates are still edited from Frappe Desk
 * at this stage — a full holiday editor is a follow-up.
 */
export default async function HolidayListsPage() {
  await requireGroup("HR_ADMIN", "/settings/holiday-lists");
  const lists = await listHolidayLists();

  return (
    <div className="flex flex-col gap-5">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit gap-1 text-xs text-muted-foreground"
      >
        <Link href={"/settings" as Route}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to settings
        </Link>
      </Button>

      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Settings · Holiday lists
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Holiday lists on this tenant
          </h1>
          <p className="text-sm text-muted-foreground">
            {lists.length} holiday list{lists.length === 1 ? "" : "s"}. Each list
            drives the calendar for whichever Company or Employee links to it.
            Weekly-off dates and individual public holidays are added to the
            list after it&apos;s created.
          </p>
        </div>
        <CreateHolidayListButton />
      </header>

      <Card>
        <CardHeader className="sr-only">
          <CardTitle>Holiday list rows</CardTitle>
          <CardDescription>
            Every holiday list this tenant can pick from.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Total holidays</TableHead>
                <TableHead>Weekly off</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No holiday lists yet. Click <b>New holiday list</b> above.
                  </TableCell>
                </TableRow>
              ) : (
                lists.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="align-top font-medium">
                      {l.name}
                      <div className="text-xs text-muted-foreground">{l.id}</div>
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {l.fromDate ?? "—"}
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {l.toDate ?? "—"}
                    </TableCell>
                    <TableCell className="text-right align-top text-muted-foreground">
                      {l.totalHolidays}
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {l.weeklyOff ?? "—"}
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
