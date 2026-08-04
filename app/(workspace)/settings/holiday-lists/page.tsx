import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, CalendarDays } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import { getMyAccess } from "@/lib/frappe/roles";
import { listHolidayLists } from "@/lib/frappe/holiday-lists";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HolidayListsAdmin } from "@/components/settings/holiday-lists-admin";

export const metadata = {
  title: "Holiday lists · Settings · Colossal HR",
};

/**
 * HR-admin surface for tenant Holiday Lists — full CRUD via the
 * shared HolidayListsAdmin client component. HR_ANY can view; HR_ADMIN
 * / IT_ADMIN see the New / Edit / Delete controls. Individual holiday
 * dates on a list are still edited from Frappe Desk at this stage.
 */
export default async function HolidayListsPage() {
  await requireGroup("HR_ANY", "/settings/holiday-lists");
  const [lists, access] = await Promise.all([
    listHolidayLists(),
    getMyAccess(),
  ]);
  const canManage = Boolean(access.isHrAdmin || access.isItAdmin);
  const initial = lists.map((l) => ({
    name: l.name,
    fromDate: l.fromDate,
    toDate: l.toDate,
    weeklyOff: l.weeklyOff,
    totalHolidays: l.totalHolidays,
  }));

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

      <header className="flex flex-col gap-1">
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
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          <HolidayListsAdmin initial={initial} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  );
}
