import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, MapPin } from "lucide-react";
import { ShiftLocationForm } from "@/components/shifts/shift-location-form";
import { listCompanies } from "@/lib/frappe/lookups";
import { createShiftLocationAction } from "../../actions";

export const metadata = { title: "New shift location · Colossal HR" };

export default async function NewShiftLocationPage() {
  const companies = await listCompanies();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/shift-management?tab=locations" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to locations
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <MapPin className="h-3.5 w-3.5" />
          HR · Shift Management · New location
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Define a shift location
        </h1>
        <p className="text-sm text-ash-600">
          Location is used for geofenced check-ins — an employee's check-in is
          accepted only when they're within the radius of an allowed location.
        </p>
      </header>

      <ShiftLocationForm
        mode="create"
        action={createShiftLocationAction}
        companies={companies}
        cancelHref="/hr/shift-management?tab=locations"
      />
    </div>
  );
}
