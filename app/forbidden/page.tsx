import Link from "next/link";
import type { Route } from "next";
import { ShieldAlert } from "lucide-react";
import { getMyRoles, ROLE_GROUPS } from "@/lib/frappe/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Forbidden · Colossal HR" };

const GROUP_HUMAN: Record<string, string> = {
  HR_ADMIN: "HR Manager or System Manager",
  HR_ANY: "an HR role (HR Manager, HR User, or HR Officer)",
  PAYROLL_ADMIN: "HR Manager or Accounts Manager",
  SHIFT_ADMIN: "HR Manager, HR User, or System Manager",
  EMPLOYEE_ANY: "any signed-in employee",
};

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: { from?: string; need?: string; reason?: string; app?: string };
}) {
  const roles = await getMyRoles();
  const mine = Array.from(roles).sort();
  const need = searchParams.need;
  const needed = need ? GROUP_HUMAN[need] ?? need : null;
  const requiredList: string[] | null = need
    ? Array.from(
        ROLE_GROUPS[need as keyof typeof ROLE_GROUPS] ?? [],
      ) as string[]
    : null;

  // Subscription-deny: the company doesn't own this app. Different
  // message; the user's roles aren't the problem.
  if (searchParams.reason === "subscription") {
    const app = searchParams.app ?? "this module";
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5 py-12">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-500" />
            <h1 className="text-xl font-semibold text-foreground">
              Your subscription doesn't include {app}
            </h1>
            <p className="text-sm text-muted-foreground">
              This module isn't part of your company's current plan. Ask
              your IT Admin to add it from Admin → Subscriptions, or talk
              to your account manager about upgrading.
            </p>
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm">
                <Link href={"/me" as Route}>Back to my workspace</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 py-12">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <ShieldAlert className="h-10 w-10 text-destructive" />
          <h1 className="text-xl font-semibold text-foreground">
            You don't have permission for this page
          </h1>
          <p className="text-sm text-muted-foreground">
            {needed
              ? `This area requires the ${needed} role.`
              : "Your current role doesn't include access here."}{" "}
            Ask your HR administrator if you need it.
          </p>

          <div className="mt-2 flex w-full flex-col gap-2 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your roles
            </p>
            {mine.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No roles assigned.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {mine.map((r) => (
                  <li key={r}>
                    <Badge variant="secondary">{r}</Badge>
                  </li>
                ))}
              </ul>
            )}

            {requiredList && requiredList.length > 0 && (
              <>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Required (any of)
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {requiredList.map((r) => (
                    <li key={r}>
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50/70 text-amber-900"
                      >
                        {r}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Button asChild size="sm">
              <Link href={"/me" as Route}>Go to my dashboard</Link>
            </Button>
            {searchParams.from && (
              <Button asChild variant="outline" size="sm">
                <Link href={"/" as Route}>Home</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
