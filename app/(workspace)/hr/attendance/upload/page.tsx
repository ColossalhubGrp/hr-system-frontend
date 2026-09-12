import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, Upload } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";
import { UploadForm } from "@/components/attendance/upload-form";
import { uploadAttendanceCsvAction } from "./actions";

export const metadata = { title: "Upload attendance · Colossal HR" };

export default async function UploadAttendancePage() {
  const access = await getMyAccess();
  if (!access.isHrAdmin) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" +
        encodeURIComponent("/hr/attendance/upload"),
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
        icon={Upload}
        crumb="HR · Attendance · Upload CSV"
        title="Upload attendance"
        subtitle="Bulk-import attendance from a spreadsheet — one row per (employee, date, status). Days already marked are skipped; malformed rows are reported back."
      />

      <UploadForm action={uploadAttendanceCsvAction} />
    </div>
  );
}
