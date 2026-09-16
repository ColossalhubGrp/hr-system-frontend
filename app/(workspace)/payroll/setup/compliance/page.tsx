import { loadComplianceSnapshot } from "@/lib/frappe/payroll-compliance";
import { CompliancePanel } from "@/components/payroll/compliance-panel";

export const metadata = { title: "ZIMRA compliance · Payroll · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const snapshot = await loadComplianceSnapshot();
  return <CompliancePanel snapshot={snapshot} />;
}
