"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";

type Props = {
  departments: string[];
  statuses: string[];
};

// Small enough to feel instant, large enough to skip most in-flight
// keystrokes so we don't fire a Frappe query per keystroke. Matches
// Frappe's own awesomebar debounce.
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Drives the directory's URL state. We push to the same path with updated
 * search params; the Server Component re-renders with fresh data. Dropdown
 * changes navigate immediately; the search box filters as the user types,
 * debounced so we don't fire a query per keystroke.
 */
export function DirectoryFilters({ departments, statuses }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  // Local controlled state so typing feels instant; the URL follows on a
  // debounce. Seeded from the URL on mount and re-synced when the URL
  // changes underneath us (back/forward, external nav).
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  function patch(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    // Filter changes always reset to page 1 — otherwise you can land on an
    // empty page after narrowing the result set.
    next.delete("page");
    start(() => router.push(`?${next.toString()}`));
  }

  // Debounced q → URL. Cleared on every keystroke so only the LAST
  // pause commits. Also cleared when q is already in sync with the
  // URL (e.g. right after we pushed it ourselves) so we don't
  // schedule redundant navigations.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (q.trim() === urlQ) return;
    timer.current = setTimeout(() => patch("q", q.trim()), SEARCH_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // patch depends on `params`, which changes on every render triggered
    // by the URL push we just fired — including it here would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, urlQ]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        // Flush any pending debounce so hitting Enter feels immediate
        // instead of waiting the remaining ms.
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        patch("q", q.trim());
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <label className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-500" />
        <input
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
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
