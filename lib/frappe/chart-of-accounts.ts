import "server-only";
import { frappeCall } from "./client";

/**
 * Chart of Accounts — the account tree per company.
 *
 * ERPNext stores accounts as a flat table with a `parent_account`
 * pointer and `lft`/`rgt` MPTT indices. We fetch all accounts for a
 * company in one call and stitch the tree in Node — it's small
 * (usually 100-300 rows) and gives us total control over sort order,
 * balances and root-type grouping.
 */

export type Account = {
  name: string;
  accountName: string;
  parent: string | null;
  isGroup: boolean;
  rootType: "Asset" | "Liability" | "Equity" | "Income" | "Expense" | null;
  accountType: string | null;
  currency: string | null;
  disabled: boolean;
  lft: number;
  rgt: number;
};

export type AccountNode = Account & {
  children: AccountNode[];
  depth: number;
};

export async function listAccountTree(company: string): Promise<AccountNode[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Account",
      // Frappe v15 restricts which fields get_list will accept. `disabled`
      // isn't in the Account doctype's `in_list_view`/`in_standard_filter`
      // set, so asking for it 417s. We fetch the row without it and treat
      // every listed account as active in the tree — the detail page still
      // shows the accurate disabled flag.
      fields: [
        "name",
        "account_name",
        "parent_account",
        "is_group",
        "root_type",
        "account_type",
        "account_currency",
        "lft",
        "rgt",
      ],
      filters: [["company", "=", company]],
      order_by: "lft asc",
      limit_page_length: 0,
    },
  });

  const accounts: Account[] = rows.map((r) => ({
    name: String(r.name ?? ""),
    accountName: String(r.account_name ?? ""),
    parent: (r.parent_account as string | null) ?? null,
    isGroup: Number(r.is_group ?? 0) === 1,
    rootType: (r.root_type as AccountNode["rootType"]) ?? null,
    accountType: (r.account_type as string | null) ?? null,
    currency: (r.account_currency as string | null) ?? null,
    // `disabled` isn't queryable via get_list on Account (Frappe v15 field
    // permission). Default to false; getAccount() below picks up the real
    // value for the detail page.
    disabled: false,
    lft: Number(r.lft ?? 0),
    rgt: Number(r.rgt ?? 0),
  }));

  // Build the tree. We keep the same MPTT (lft asc) order so children
  // stay in the ledger's canonical sequence.
  const byName = new Map<string, AccountNode>();
  for (const a of accounts) byName.set(a.name, { ...a, children: [], depth: 0 });

  const roots: AccountNode[] = [];
  for (const a of accounts) {
    const node = byName.get(a.name)!;
    if (a.parent && byName.has(a.parent)) {
      const parent = byName.get(a.parent)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function getAccount(name: string): Promise<Account | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Account", name },
    });
    return {
      name: String(doc.name ?? name),
      accountName: String(doc.account_name ?? ""),
      parent: (doc.parent_account as string | null) ?? null,
      isGroup: Number(doc.is_group ?? 0) === 1,
      rootType: (doc.root_type as Account["rootType"]) ?? null,
      accountType: (doc.account_type as string | null) ?? null,
      currency: (doc.account_currency as string | null) ?? null,
      disabled: Number(doc.disabled ?? 0) === 1,
      lft: Number(doc.lft ?? 0),
      rgt: Number(doc.rgt ?? 0),
    };
  } catch {
    return null;
  }
}
