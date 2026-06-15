import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ApplyForLeaveForm } from "@/components/me/apply-for-leave-form";
import { listLeaveTypes } from "@/lib/frappe/my-self-service";
import { applyForLeaveAction } from "../actions";

export const metadata = { title: "Apply for leave · Colossal HR" };

export default async function NewLeavePage() {
  const types = await listLeaveTypes();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Link
        href={"/me/leave" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to my leave
      </Link>
      <PageHeader
        icon={CalendarDays}
        crumb="My workspace · Leave · New"
        title="Apply for leave"
        subtitle="Pick the type, the dates, and a reason. Your approver gets it next."
      />
      <ApplyForLeaveForm action={applyForLeaveAction} leaveTypes={types} />
    </div>
  );
}
