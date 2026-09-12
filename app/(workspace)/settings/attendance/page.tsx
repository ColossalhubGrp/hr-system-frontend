import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CalendarCheck, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import { getShiftHrSettings } from "@/lib/frappe/hr-settings";
import { AttendanceSettingsForm } from "@/components/settings/attendance-settings-form";
import { saveAttendanceSettingsAction } from "./actions";

export const metadata = {
  title: "Attendance & shifts · Configuration · Colossal HR",
};

export default async function AttendanceSettingsPage() {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent("/settings/attendance"),
    );
  }

  const settings = await getShiftHrSettings();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Configuration
      </Link>

      <PageHeader
        icon={CalendarCheck}
        crumb="Configuration · HR policy · Attendance & shifts"
        title="Attendance & shifts"
        subtitle="Two org-wide toggles that govern how strictly check-ins and shift assignments behave."
      />

      <AttendanceSettingsForm
        action={saveAttendanceSettingsAction}
        initial={settings}
      />
    </div>
  );
}
