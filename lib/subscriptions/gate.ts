import "server-only";
import { redirect } from "next/navigation";
import { hasApp } from "./server";

/**
 * Server-side gate for app layouts.
 *
 * Usage at the top of a layout for an app-gated subtree:
 *
 *     await requireApp("payroll", "/payroll");
 *
 * - `appCode` — what the company must be subscribed to.
 * - `fromPath` — where the user was trying to go; used by the deny page
 *   to render a meaningful "back" link.
 *
 * The check is server-side. The sidebar filter already hides the nav
 * entries for unsubscribed apps; this is the defense-in-depth layer
 * that catches direct URLs / bookmarks.
 */
export async function requireApp(appCode: string, fromPath?: string): Promise<void> {
  if (await hasApp(appCode)) return;
  const url = fromPath
    ? `/forbidden?reason=subscription&app=${encodeURIComponent(appCode)}&from=${encodeURIComponent(fromPath)}`
    : `/forbidden?reason=subscription&app=${encodeURIComponent(appCode)}`;
  redirect(url);
}
