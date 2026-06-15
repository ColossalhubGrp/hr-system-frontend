import { requireGroup } from "@/lib/frappe/require-role";

/**
 * Data Steward workspace — read-only metric catalog, reference data inventory,
 * and data-quality probes. Lives at workspace root (NOT under /hr/) so a
 * Data-Steward-only user isn't blocked by HR_ANY on the way in.
 */
export default async function DataStewardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGroup("DATA_STEWARD", "/data-steward");
  return <>{children}</>;
}
