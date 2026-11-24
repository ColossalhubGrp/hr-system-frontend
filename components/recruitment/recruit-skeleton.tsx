import { PageSkeleton } from "@/components/common/page-skeleton";

/**
 * Loading placeholder for the recruitment pages. The recruitment module
 * was a verbatim-copied standalone app that used an ad-hoc centred
 * spinner; this reuses the same `PageSkeleton` the rest of the workspace
 * shows via its `loading.tsx` files, so the whole system loads the same
 * way (full-width skeleton, not a spinner).
 */
export function RecruitPageSkeleton() {
  return <PageSkeleton />;
}
