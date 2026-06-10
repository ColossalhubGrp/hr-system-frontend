"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";

type Props = {
  departments: string[];
  statuses: string[];
};

/**
 * Drives the directory's URL state. We push to the same path with updated
 * search params; the Server Component re-renders with fresh data. Submitting
 * the search field or changing a dropdown is a "navigation", which keeps
 * back/forward usable.
 */
export function DirectoryFilters({ departments, statuses }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function patch(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    // Filter changes always reset to page 1 — otherwise you can land on an
    // empty page after narrowing the result set.
    next.delete("page");
    start(() => router.push(`?${next.toString()}`));
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = (
          (e.currentTarget.elements.namedItem("q") as HTMLInputElement | null)
            ?.value ?? ""
        ).trim();
        patch("q", q);
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <label className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-500" />
        <input
          name="q"
          type="search"
          defaultValue={params.get("q") ?? ""}
          placeholder="Search by name, ID, or email"
          className="h-10 w-full rounded-chip border border-hairline bg-surface pl-9 pr-4 text-sm placeholder:text-ash-500 focus-ring"
        />
      </label>

      <Select
        label="Department"
        value={params.get("department") ?? ""}
        onChange={(v) => patch("department", v)}
        options={departments}
      />
      <Select
        label="Status"
        value={params.get("status") ?? ""}
        onChange={(v) => patch("status", v)}
        options={statuses}
      />

      <noscript>
        <button
          type="submit"
          className="h-10 rounded-chip bg-ink-800 px-4 text-sm font-medium text-white"
        >
          Search
        </button>
      </noscript>

      <span
        aria-live="polite"
        className={`text-xs text-ash-500 ${pending ? "opacity-100" : "opacity-0"}`}
      >
        Updating…
      </span>
    </form>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-chip border border-hairline bg-surface pl-3 pr-8 text-sm text-ash-800 focus-ring"
      >
        <option value="">{`All ${label.toLowerCase()}s`}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
