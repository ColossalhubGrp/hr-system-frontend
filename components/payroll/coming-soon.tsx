import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Stub used by sub-routes that are scaffolded but not yet implemented.
 * Lists what the page WILL do so reviewers can sanity-check scope, plus
 * a back link to /payroll.
 */
export function ComingSoon({
  title,
  crumb,
  bullets,
}: {
  title: string;
  crumb: string;
  bullets: string[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" size="sm" className="w-fit gap-1 text-xs text-muted-foreground">
        <Link href={"/payroll" as Route}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to pay runs
        </Link>
      </Button>

      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Construction className="h-3.5 w-3.5" />
          {crumb}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">
          This surface is scaffolded but not yet wired. The DocType + API are
          ready (see the bullets below); the page implementation lands in the
          next port turn.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-2 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What this page will do
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
