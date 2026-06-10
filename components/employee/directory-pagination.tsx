"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function DirectoryPagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  function goto(p: number) {
    const next = new URLSearchParams(params.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    router.push(`?${next.toString()}`);
  }

  return (
    <div className="flex items-center justify-between gap-3 px-1 text-xs text-ash-600">
      <span>
        Showing <strong className="text-ash-900">{start}</strong>–
        <strong className="text-ash-900">{end}</strong> of{" "}
        <strong className="text-ash-900">{total}</strong>
      </span>
      <div className="flex items-center gap-1">
        <PagerBtn
          disabled={page <= 1}
          onClick={() => goto(page - 1)}
          ariaLabel="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </PagerBtn>
        <span className="px-2 text-ash-700">
          Page <strong className="text-ash-900">{page}</strong> of {lastPage}
        </span>
        <PagerBtn
          disabled={page >= lastPage}
          onClick={() => goto(page + 1)}
          ariaLabel="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </PagerBtn>
      </div>
    </div>
  );
}

function PagerBtn({
  disabled,
  onClick,
  ariaLabel,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-full bg-surface text-ash-700 shadow-card focus-ring",
        "transition hover:bg-canvas",
        "disabled:opacity-40 disabled:cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}
