import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  CalendarCheck,
  ChevronLeft,
  Clock,
  Fingerprint,
  Settings2,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ModuleSetupGrid, type SetupCard } from "@/components/settings/module-setup-grid";
import { getMyAccess } from "@/lib/frappe/roles";

export const metadata = { title: "Attendance setup · Colossal HR" };

const CARDS: SetupCard[] = [
  {
    href: "/settings/attendance",
    icon: <CalendarCheck className="h-4 w-4" />,
    title: "Attendance & shifts",
    desc: "Org-wide switches for geolocation tracking on check-ins and whether the same employee can hold overlapping Shift Assignments.",
  },
  {
    href: "/settings/biometric",
    icon: <Fingerprint className="h-4 w-4" />,
    title: "Biometric devices",
    desc: "How to wire on-site fingerprint / face / RFID readers so punches flow into Attendance automatically.",
  },
  {
    href: "/settings/overtime",
    icon: <Clock className="h-4 w-4" />,
    title: "Overtime rules",
    desc: "Define and assign overtime thresholds, calculation methods and effective dates — cascading from company → department → employee.",
  },
];

export default async function AttendanceSetupPage() {
  const access = await getMyAccess();
  if (!access.isHrAdmin && !access.isItAdmin) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" + encodeURIComponent("/hr/attendance/setup"),
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/attendance" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to attendance
      </Link>
      <PageHeader
        icon={Settings2}
        crumb="HR · Attendance · Setup"
        title="Attendance setup"
        subtitle="Master data for attendance, shifts, biometric devices and overtime rules. Changes here flow into the next punch and the next overtime slip."
      />
      <ModuleSetupGrid cards={CARDS} />
    </div>
  );
}
