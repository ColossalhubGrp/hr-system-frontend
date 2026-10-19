/**
 * Quick-create registry.
 *
 * One entry per DocType that we want to let users create inline from
 * a Link dropdown without leaving the current form (the Frappe-Desk
 * "+ Create new X" behaviour).
 *
 * Each entry declares:
 *   - `label`     — human singular (e.g. "Customer")
 *   - `search`    — Frappe fields to pull back on search; the first is the
 *                   display label, the rest are the search index
 *   - `fields`    — the minimum set of fields the quick-create dialog
 *                   collects. The caller may seed `defaults` so a form
 *                   can pre-fill (e.g. the Company already selected).
 *
 * To cover a new DocType, add an entry here — no changes needed in
 * the LinkField component itself.
 */

export type QuickCreateField =
  | { name: string; label: string; type: "text"; required?: boolean; placeholder?: string }
  | { name: string; label: string; type: "number"; required?: boolean; min?: number; placeholder?: string }
  | { name: string; label: string; type: "select"; required?: boolean; options: string[] }
  | { name: string; label: string; type: "link"; required?: boolean; linkDoctype: string }
  | { name: string; label: string; type: "check"; required?: boolean };

export type LinkEntry = {
  /** Singular human label, e.g. "Customer". */
  label: string;
  /** Fields `get_list` returns on each search hit. First is display. */
  search: string[];
  /** Frappe-side filters always applied to search queries. */
  staticFilters?: Array<[string, string, unknown]>;
  /** The quick-create dialog's form fields. */
  fields: QuickCreateField[];
  /** Fields the dialog expects the host form to seed (e.g. "company"). */
  seedFields?: string[];
};

export const LINK_REGISTRY: Record<string, LinkEntry> = {
  // ─── Sales / Buying parties ──────────────────────────────────────
  Customer: {
    label: "Customer",
    search: ["name", "customer_name"],
    fields: [
      { name: "customer_name", label: "Customer Name", type: "text", required: true },
      { name: "customer_type", label: "Type", type: "select", required: true, options: ["Company", "Individual", "Partnership"] },
      { name: "customer_group", label: "Customer Group", type: "link", linkDoctype: "Customer Group" },
      { name: "territory", label: "Territory", type: "link", linkDoctype: "Territory" },
    ],
  },
  Supplier: {
    label: "Supplier",
    search: ["name", "supplier_name"],
    fields: [
      { name: "supplier_name", label: "Supplier Name", type: "text", required: true },
      { name: "supplier_type", label: "Type", type: "select", required: true, options: ["Company", "Individual", "Partnership"] },
      { name: "supplier_group", label: "Supplier Group", type: "link", linkDoctype: "Supplier Group" },
      { name: "country", label: "Country", type: "link", linkDoctype: "Country" },
    ],
  },

  // ─── Items + inventory ───────────────────────────────────────────
  Item: {
    label: "Item",
    search: ["name", "item_name", "item_code"],
    fields: [
      { name: "item_code", label: "Item Code", type: "text", required: true },
      { name: "item_name", label: "Item Name", type: "text", required: true },
      { name: "item_group", label: "Item Group", type: "link", required: true, linkDoctype: "Item Group" },
      { name: "stock_uom", label: "Default Unit", type: "link", required: true, linkDoctype: "UOM" },
      { name: "is_stock_item", label: "Maintains Stock", type: "check" },
    ],
  },
  "Item Group": {
    label: "Item Group",
    search: ["name", "item_group_name"],
    fields: [
      { name: "item_group_name", label: "Item Group", type: "text", required: true },
      { name: "parent_item_group", label: "Parent Group", type: "link", linkDoctype: "Item Group" },
      { name: "is_group", label: "Is a Group", type: "check" },
    ],
  },
  UOM: {
    label: "Unit of Measure",
    search: ["name", "uom_name"],
    fields: [
      { name: "uom_name", label: "UOM Name", type: "text", required: true },
      { name: "must_be_whole_number", label: "Whole-number only", type: "check" },
    ],
  },
  Warehouse: {
    label: "Warehouse",
    search: ["name", "warehouse_name"],
    fields: [
      { name: "warehouse_name", label: "Warehouse Name", type: "text", required: true },
      { name: "parent_warehouse", label: "Parent Warehouse", type: "link", linkDoctype: "Warehouse" },
      { name: "is_group", label: "Is a Group", type: "check" },
    ],
    seedFields: ["company"],
  },

  // ─── Grouping / segmentation ─────────────────────────────────────
  "Customer Group": {
    label: "Customer Group",
    search: ["name", "customer_group_name"],
    fields: [
      { name: "customer_group_name", label: "Group Name", type: "text", required: true },
      { name: "parent_customer_group", label: "Parent Group", type: "link", linkDoctype: "Customer Group" },
    ],
  },
  "Supplier Group": {
    label: "Supplier Group",
    search: ["name", "supplier_group_name"],
    fields: [
      { name: "supplier_group_name", label: "Group Name", type: "text", required: true },
      { name: "parent_supplier_group", label: "Parent Group", type: "link", linkDoctype: "Supplier Group" },
    ],
  },
  Territory: {
    label: "Territory",
    search: ["name", "territory_name"],
    fields: [
      { name: "territory_name", label: "Territory Name", type: "text", required: true },
      { name: "parent_territory", label: "Parent Territory", type: "link", linkDoctype: "Territory" },
    ],
  },
  Country: {
    label: "Country",
    search: ["name", "country_name"],
    fields: [
      { name: "country_name", label: "Country Name", type: "text", required: true },
      { name: "code", label: "ISO Code", type: "text", required: true },
    ],
  },
  Industry: {
    label: "Industry",
    search: ["name"],
    fields: [{ name: "industry", label: "Industry Name", type: "text", required: true }],
  },
  "Market Segment": {
    label: "Market Segment",
    search: ["name"],
    fields: [{ name: "market_segment", label: "Market Segment", type: "text", required: true }],
  },
  Language: {
    label: "Language",
    search: ["name", "language_name"],
    fields: [
      { name: "language_name", label: "Language Name", type: "text", required: true },
      { name: "language_code", label: "ISO Code", type: "text", required: true },
    ],
  },

  // ─── HR primitives ───────────────────────────────────────────────
  Employee: {
    label: "Employee",
    search: ["name", "employee_name"],
    staticFilters: [["status", "=", "Active"]],
    fields: [
      { name: "first_name", label: "First Name", type: "text", required: true },
      { name: "last_name", label: "Last Name", type: "text" },
      { name: "gender", label: "Gender", type: "select", required: true, options: ["Male", "Female", "Other", "Prefer not to say"] },
      { name: "date_of_birth", label: "Date of Birth", type: "text", required: true, placeholder: "YYYY-MM-DD" },
      { name: "date_of_joining", label: "Date of Joining", type: "text", required: true, placeholder: "YYYY-MM-DD" },
      { name: "company", label: "Company", type: "link", required: true, linkDoctype: "Company" },
    ],
    seedFields: ["company"],
  },
  Department: {
    label: "Department",
    search: ["name", "department_name"],
    fields: [
      { name: "department_name", label: "Department Name", type: "text", required: true },
      { name: "parent_department", label: "Parent Department", type: "link", linkDoctype: "Department" },
      { name: "is_group", label: "Is a Group", type: "check" },
    ],
    seedFields: ["company"],
  },
  Branch: {
    label: "Branch",
    search: ["name", "branch"],
    fields: [{ name: "branch", label: "Branch", type: "text", required: true }],
  },
  Designation: {
    label: "Designation",
    search: ["name", "designation_name"],
    fields: [{ name: "designation_name", label: "Designation", type: "text", required: true }],
  },
  "Employment Type": {
    label: "Employment Type",
    search: ["name", "employee_type_name"],
    fields: [{ name: "employee_type_name", label: "Employment Type", type: "text", required: true }],
  },
  "Holiday List": {
    label: "Holiday List",
    search: ["name", "holiday_list_name"],
    fields: [
      { name: "holiday_list_name", label: "Holiday List Name", type: "text", required: true },
      { name: "from_date", label: "From Date", type: "text", required: true, placeholder: "YYYY-MM-DD" },
      { name: "to_date", label: "To Date", type: "text", required: true, placeholder: "YYYY-MM-DD" },
    ],
  },
  "Leave Type": {
    label: "Leave Type",
    search: ["name"],
    fields: [
      { name: "leave_type_name", label: "Leave Type", type: "text", required: true },
      { name: "max_leaves_allowed", label: "Max Days Per Year", type: "number" },
    ],
  },
  "Expense Claim Type": {
    label: "Expense Claim Type",
    search: ["name"],
    fields: [{ name: "name", label: "Expense Claim Type", type: "text", required: true }],
  },
  "Shift Type": {
    label: "Shift Type",
    search: ["name"],
    fields: [
      { name: "name", label: "Shift Name", type: "text", required: true },
      { name: "start_time", label: "Start Time", type: "text", required: true, placeholder: "HH:MM:SS" },
      { name: "end_time", label: "End Time", type: "text", required: true, placeholder: "HH:MM:SS" },
    ],
  },
  "Shift Schedule": {
    label: "Shift Schedule",
    search: ["name", "schedule_name"],
    fields: [
      { name: "schedule_name", label: "Schedule Name", type: "text", required: true },
      { name: "shift_type", label: "Shift Type", type: "link", required: true, linkDoctype: "Shift Type" },
    ],
  },
  "Shift Location": {
    label: "Shift Location",
    search: ["name"],
    fields: [{ name: "name", label: "Location Name", type: "text", required: true }],
  },
  "Pay Grade": {
    label: "Pay Grade",
    search: ["name"],
    fields: [
      { name: "name", label: "Grade Name", type: "text", required: true },
      { name: "default_base_pay", label: "Default Base Pay", type: "number" },
    ],
  },
  "Nec Industry": {
    label: "NEC Industry",
    search: ["name", "industry_name"],
    fields: [{ name: "industry_name", label: "Industry", type: "text", required: true }],
  },
  Skill: {
    label: "Skill",
    search: ["name"],
    fields: [{ name: "name", label: "Skill", type: "text", required: true }],
  },
  "Training Program": {
    label: "Training Program",
    search: ["name", "program_name"],
    fields: [{ name: "program_name", label: "Program Name", type: "text", required: true }],
  },
  "Training Event": {
    label: "Training Event",
    search: ["name", "event_name"],
    fields: [
      { name: "event_name", label: "Event Name", type: "text", required: true },
      { name: "start_time", label: "Start Date", type: "text", required: true, placeholder: "YYYY-MM-DD" },
      { name: "end_time", label: "End Date", type: "text", required: true, placeholder: "YYYY-MM-DD" },
    ],
  },
  "Appraisal Cycle": {
    label: "Appraisal Cycle",
    search: ["name", "cycle_name"],
    fields: [{ name: "cycle_name", label: "Cycle Name", type: "text", required: true }],
  },
  "Appraisal Template": {
    label: "Appraisal Template",
    search: ["name"],
    fields: [{ name: "template_title", label: "Template Title", type: "text", required: true }],
  },
  "Salary Structure": {
    label: "Salary Structure",
    search: ["name"],
    fields: [{ name: "name", label: "Structure Name", type: "text", required: true }],
    seedFields: ["company"],
  },
  "Salary Component": {
    label: "Salary Component",
    search: ["name", "salary_component_name"],
    fields: [
      { name: "salary_component", label: "Component Name", type: "text", required: true },
      { name: "type", label: "Type", type: "select", required: true, options: ["Earning", "Deduction"] },
    ],
  },
  "Loan Type": {
    label: "Loan Type",
    search: ["name"],
    fields: [{ name: "name", label: "Loan Type", type: "text", required: true }],
  },
  "Leave Policy": {
    label: "Leave Policy",
    search: ["name", "title"],
    fields: [{ name: "title", label: "Policy Title", type: "text", required: true }],
  },
  "Travel Request Type": {
    label: "Travel Type",
    search: ["name"],
    fields: [{ name: "name", label: "Travel Type", type: "text", required: true }],
  },

  // ─── Accounting (Colossal) ───────────────────────────────────────
  "Colossal Account": {
    label: "Account",
    search: ["name", "account_name", "account_number"],
    fields: [
      { name: "account_name", label: "Account Name", type: "text", required: true },
      { name: "account_number", label: "Account Number", type: "text" },
      { name: "parent_account", label: "Parent Account", type: "link", required: true, linkDoctype: "Colossal Account" },
      { name: "account_type", label: "Account Type", type: "select", options: ["", "Bank", "Cash", "Receivable", "Payable", "Tax", "Income Account", "Expense Account", "Fixed Asset", "Stock", "Cost of Goods Sold"] },
      { name: "is_group", label: "Is a Group", type: "check" },
    ],
    seedFields: ["company"],
  },
  "Colossal Cost Center": {
    label: "Cost Center",
    search: ["name", "cost_center_name"],
    fields: [
      { name: "cost_center_name", label: "Cost Center Name", type: "text", required: true },
      { name: "parent_cost_center", label: "Parent Cost Center", type: "link", linkDoctype: "Colossal Cost Center" },
      { name: "is_group", label: "Is a Group", type: "check" },
    ],
    seedFields: ["company"],
  },
  "Colossal Fiscal Year": {
    label: "Fiscal Year",
    search: ["name"],
    fields: [
      { name: "year", label: "Year", type: "text", required: true },
      { name: "year_start_date", label: "Start Date", type: "text", required: true, placeholder: "YYYY-MM-DD" },
      { name: "year_end_date", label: "End Date", type: "text", required: true, placeholder: "YYYY-MM-DD" },
    ],
  },
  "Colossal Finance Book": {
    label: "Finance Book",
    search: ["name", "finance_book_name"],
    fields: [{ name: "finance_book_name", label: "Finance Book Name", type: "text", required: true }],
  },
  "Colossal Mode of Payment": {
    label: "Mode of Payment",
    search: ["name", "mode_of_payment"],
    fields: [
      { name: "mode_of_payment", label: "Mode Name", type: "text", required: true },
      { name: "type", label: "Type", type: "select", required: true, options: ["Cash", "Bank", "General", "Phone"] },
    ],
  },
  "Colossal Payment Terms Template": {
    label: "Payment Terms Template",
    search: ["name", "template_name"],
    fields: [{ name: "template_name", label: "Template Name", type: "text", required: true }],
  },
  "Colossal Payment Term": {
    label: "Payment Term",
    search: ["name", "payment_term_name"],
    fields: [
      { name: "payment_term_name", label: "Term Name", type: "text", required: true },
      { name: "credit_days", label: "Credit Days", type: "number" },
    ],
  },
  "Colossal Tax Category": {
    label: "Tax Category",
    search: ["name", "title"],
    fields: [{ name: "title", label: "Tax Category Title", type: "text", required: true }],
  },
  "Colossal Accounting Dimension": {
    label: "Accounting Dimension",
    search: ["name", "document_type"],
    fields: [
      { name: "document_type", label: "Reference DocType", type: "text", required: true },
      { name: "label", label: "Label", type: "text", required: true },
    ],
  },
  Bank: {
    label: "Bank",
    search: ["name", "bank_name"],
    fields: [{ name: "bank_name", label: "Bank Name", type: "text", required: true }],
  },
  "Bank Account": {
    label: "Bank Account",
    search: ["name", "account_name"],
    fields: [
      { name: "account_name", label: "Account Name", type: "text", required: true },
      { name: "bank", label: "Bank", type: "link", required: true, linkDoctype: "Bank" },
    ],
    seedFields: ["company"],
  },
  "Colossal Monthly Distribution": {
    label: "Monthly Distribution",
    search: ["name", "distribution_id"],
    fields: [{ name: "distribution_id", label: "Distribution ID", type: "text", required: true }],
  },
  "Monthly Distribution": {
    label: "Monthly Distribution",
    search: ["name", "distribution_id"],
    fields: [{ name: "distribution_id", label: "Distribution ID", type: "text", required: true }],
  },
  "Colossal Shareholder": {
    label: "Shareholder",
    search: ["name", "title"],
    fields: [{ name: "title", label: "Shareholder Name", type: "text", required: true }],
    seedFields: ["company"],
  },
  Shareholder: {
    label: "Shareholder",
    search: ["name", "title"],
    fields: [{ name: "title", label: "Shareholder Name", type: "text", required: true }],
    seedFields: ["company"],
  },
  "Subscription Plan": {
    label: "Subscription Plan",
    search: ["name", "plan_name"],
    fields: [{ name: "plan_name", label: "Plan Name", type: "text", required: true }],
  },
  "Colossal Subscription Plan": {
    label: "Subscription Plan",
    search: ["name", "plan_name"],
    fields: [{ name: "plan_name", label: "Plan Name", type: "text", required: true }],
  },
  "Sales Taxes and Charges Template": {
    label: "Sales Tax Template",
    search: ["name", "title"],
    fields: [{ name: "title", label: "Template Title", type: "text", required: true }],
    seedFields: ["company"],
  },
  "Purchase Taxes and Charges Template": {
    label: "Purchase Tax Template",
    search: ["name", "title"],
    fields: [{ name: "title", label: "Template Title", type: "text", required: true }],
    seedFields: ["company"],
  },
  "Colossal Sales Taxes and Charges Template": {
    label: "Sales Tax Template",
    search: ["name", "title"],
    fields: [{ name: "title", label: "Template Title", type: "text", required: true }],
    seedFields: ["company"],
  },
  "Colossal Purchase Taxes and Charges Template": {
    label: "Purchase Tax Template",
    search: ["name", "title"],
    fields: [{ name: "title", label: "Template Title", type: "text", required: true }],
    seedFields: ["company"],
  },
  "Price List": {
    label: "Price List",
    search: ["name", "price_list_name"],
    fields: [
      { name: "price_list_name", label: "Price List Name", type: "text", required: true },
      { name: "currency", label: "Currency", type: "link", required: true, linkDoctype: "Currency" },
      { name: "buying", label: "For Buying", type: "check" },
      { name: "selling", label: "For Selling", type: "check" },
    ],
  },

  // ─── Base reference data ─────────────────────────────────────────
  Currency: {
    label: "Currency",
    search: ["name", "currency_name"],
    fields: [
      { name: "currency_name", label: "Currency Name", type: "text", required: true },
      { name: "symbol", label: "Symbol", type: "text", required: true },
    ],
  },
  Project: {
    label: "Project",
    search: ["name", "project_name"],
    fields: [
      { name: "project_name", label: "Project Name", type: "text", required: true },
      { name: "status", label: "Status", type: "select", options: ["Open", "Completed", "Cancelled"] },
    ],
    seedFields: ["company"],
  },
  Company: {
    label: "Company",
    search: ["name", "company_name"],
    fields: [
      { name: "company_name", label: "Company Name", type: "text", required: true },
      { name: "abbr", label: "Abbreviation", type: "text", required: true },
      { name: "default_currency", label: "Default Currency", type: "link", required: true, linkDoctype: "Currency" },
      { name: "country", label: "Country", type: "link", required: true, linkDoctype: "Country" },
    ],
  },
};

/** True if we can offer "+ Create new X" for this doctype. */
export function isCreatable(doctype: string): boolean {
  return doctype in LINK_REGISTRY;
}
