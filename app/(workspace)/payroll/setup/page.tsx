import { redirect } from "next/navigation";

export default function SetupIndex() {
  // First sub-tab is the default landing.
  redirect("/payroll/setup/banks");
}
