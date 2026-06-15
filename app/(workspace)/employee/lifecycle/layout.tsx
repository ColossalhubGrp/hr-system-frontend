import { requireGroup } from "@/lib/frappe/require-role";

/**
 * Employee Lifecycle (onboarding, separation, transfer, promotion, grievance)
 * is HR-administered. Employees viewing their own records would go via /me
 * in a future iteration.
 */
export default async function EmployeeLifecycleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGroup("HR_ANY", "/employee/lifecycle");
  return <>{children}</>;
}
