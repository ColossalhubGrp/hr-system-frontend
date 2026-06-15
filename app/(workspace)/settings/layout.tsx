import { requireGroup } from "@/lib/frappe/require-role";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // /settings is the union of HR-policy + IT-admin tools. Each card on the
  // landing page filters itself further so an HR Director sees Performance /
  // Overtime / Company config but not Users & Roles, and an IT Admin sees
  // the system tools but not HR-policy ones (unless they hold both roles).
  await requireGroup("SETTINGS_ANY", "/settings");
  return <>{children}</>;
}
