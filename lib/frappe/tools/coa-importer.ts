import "server-only";
import { frappeCall } from "../client";

/**
 * ERPNext "Chart of Accounts Importer" — uploads a CSV/JSON template
 * defining the account hierarchy and creates every account in one
 * shot. Used once per company on setup.
 */

export async function importChartOfAccounts(opts: {
  company: string;
  fileUrl: string;
  chartName?: string;
}): Promise<void> {
  await frappeCall({
    method: "erpnext.accounts.doctype.chart_of_accounts_importer.chart_of_accounts_importer.import_coa",
    as: "user",
    verb: "POST",
    args: {
      company: opts.company,
      file_name: opts.fileUrl,
      chart_name: opts.chartName,
    },
  });
}
