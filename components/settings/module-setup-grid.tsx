import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SetupCard = {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
};

/** Table of setting rows scoped to one module — used by every
 *  /<module>/setup landing page so the visual footprint is identical to
 *  the Configuration table. Each row's href is decorated with
 *  `?from=<fromPath>` so the settings page's back link returns to this
 *  Setup surface instead of the top-level Configuration page. */
export function ModuleSetupGrid({
  cards,
  fromPath,
}: {
  cards: SetupCard[];
  /** Absolute path of the module Setup page hosting this table. Written
   *  onto each row's `?from=` param so the target settings page can send
   *  the user back here. */
  fromPath: string;
}) {
  const withFrom = (href: string) => {
    const sep = href.includes("?") ? "&" : "?";
    return `${href}${sep}from=${encodeURIComponent(fromPath)}`;
  };
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setting</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((c) => (
              <TableRow key={c.href} className="group">
                <TableCell className="align-top font-medium">
                  <Link
                    href={withFrom(c.href) as Route}
                    className="flex items-center gap-2 text-foreground hover:underline"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      {c.icon}
                    </span>
                    {c.title}
                  </Link>
                </TableCell>
                <TableCell className="align-top text-muted-foreground">
                  <Link href={withFrom(c.href) as Route} className="block">
                    {c.desc}
                  </Link>
                </TableCell>
                <TableCell className="text-right align-top">
                  <Link
                    href={withFrom(c.href) as Route}
                    className="inline-flex text-muted-foreground group-hover:text-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
