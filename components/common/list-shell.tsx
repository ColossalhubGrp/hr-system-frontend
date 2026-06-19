"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function FilterRow({
  selects,
  search,
}: {
  selects?: Array<{ key: string; label: string; options: string[] }>;
  search?: { key: string; placeholder: string };
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
      {search && (
        <input
          type="search"
          defaultValue={params.get(search.key) ?? ""}
          placeholder={search.placeholder}
          onBlur={(e) => patch(search.key, e.currentTarget.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              patch(search.key, e.currentTarget.value.trim());
            }
          }}
          className="h-10 w-full max-w-xs rounded-full border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:flex-1"
        />
      )}
      {selects?.map((s) => (
        <label key={s.key} className="relative inline-flex items-center">
          <span className="sr-only">{s.label}</span>
          <select
            value={params.get(s.key) ?? ""}
            onChange={(e) => patch(s.key, e.target.value)}
            className="h-10 rounded-full border border-input bg-background pl-3 pr-8 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All {s.label.toLowerCase()}s</option>
            {s.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      ))}
      <span
        aria-live="polite"
        className={`text-xs text-muted-foreground ${pending ? "opacity-100" : "opacity-0"}`}
      >
        Updating…
      </span>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-card py-12 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
