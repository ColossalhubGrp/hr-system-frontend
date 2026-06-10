"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function LeavesFilters({
  leaveTypes,
  statuses,
}: {
  leaveTypes: string[];
  statuses: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function patch(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    start(() => router.push(`?${next.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select
        label="Status"
        value={params.get("status") ?? ""}
        onChange={(v) => patch("status", v)}
        options={statuses}
      />
      <Select
        label="Leave type"
        value={params.get("type") ?? ""}
        onChange={(v) => patch("type", v)}
        options={leaveTypes}
      />
      <input
        type="search"
        defaultValue={params.get("employee") ?? ""}
        placeholder="Filter by employee ID"
        onBlur={(e) => patch("employee", e.currentTarget.value.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            patch("employee", e.currentTarget.value.trim());
          }
        }}
        className="h-10 w-full max-w-xs rounded-chip border border-hairline bg-surface px-4 text-sm placeholder:text-ash-500 focus-ring sm:w-64"
      />
      <span
        aria-live="polite"
        className={`text-xs text-ash-500 ${pending ? "opacity-100" : "opacity-0"}`}
      >
        Updating…
      </span>
    </div>
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
        <option value="">All {label.toLowerCase()}s</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
