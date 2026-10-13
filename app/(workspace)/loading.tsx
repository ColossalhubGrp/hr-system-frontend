import { PageSkeleton } from "@/components/common/page-skeleton";

/**
 * Default workspace loading boundary. Shows the moment the user
 * clicks a nav item — Next.js renders this while the server tree
 * for the new route is still streaming in. The sidebar + topbar
 * stay mounted (they belong to the layout above), so only the
 * main content area shimmers.
 *
 * Specific routes can override this with their own loading.tsx
 * (e.g. /dashboard uses the KPI+chart-shaped DashboardSkeleton).
 */
export default function WorkspaceLoading() {
  return <PageSkeleton />;
}
