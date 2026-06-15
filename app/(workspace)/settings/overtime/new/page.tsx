import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Clock } from "lucide-react";
import { requireGroup } from "@/lib/frappe/require-role";
import { OvertimeRuleForm } from "@/components/overtime/overtime-rule-form";
import { createOvertimeRuleAction } from "../actions";

export const metadata = {
  title: "New overtime rule · Settings · Colossal HR",
};

export default async function NewOvertimeRulePage() {
  await requireGroup("HR_ADMIN", "/settings/overtime/new");

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/settings/overtime" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to overtime rules
      </Link>
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Clock className="h-3.5 w-3.5" />
          Settings · Overtime rules · New
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          New overtime rule
        </h1>
        <p className="text-sm text-ash-600">
          Define the rule first. After saving you'll be able to attach
          assignments (Global / Country / Department / Employment Type / Employee).
        </p>
      </header>

      <OvertimeRuleForm
        mode="create"
        action={createOvertimeRuleAction}
        cancelHref="/settings/overtime"
      />
    </div>
  );
}
