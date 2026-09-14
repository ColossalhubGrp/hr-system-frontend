import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Target } from "lucide-react";
import { getDefaultPerformanceFramework } from "@/lib/frappe/hr-settings";
import { requireGroup } from "@/lib/frappe/require-role";
import { FrameworkDefaultForm } from "@/components/settings/framework-default-form";
import { setDefaultFrameworkAction } from "./actions";
import { SettingsBackLink } from "@/components/settings/settings-back-link";

export const metadata = { title: "Performance management · Settings · Colossal HR" };

export default async function PerformanceSettingsPage() {
  // HR-policy area — explicit per-page guard on top of the SETTINGS_ANY
  // layout. An IT Admin who lands here without HR roles is bounced.
  await requireGroup("HR_ADMIN", "/settings/performance");
  const current = await getDefaultPerformanceFramework();

  return (
    <div className="flex flex-col gap-5">
      <SettingsBackLink />
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Target className="h-3.5 w-3.5" />
          Settings · Performance management
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Default performance framework
        </h1>
        <p className="text-sm text-ash-600">
          Every new Appraisal Cycle starts with this framework pre-selected.
          HR can still override it per cycle — the change only affects what
          NEW cycles are seeded with, not cycles already running.
        </p>
      </header>

      <FrameworkDefaultForm action={setDefaultFrameworkAction} initial={current} />
    </div>
  );
}
