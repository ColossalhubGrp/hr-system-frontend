import Link from "next/link";
import type { Route } from "next";
import {
  ChevronRight,
  GitBranch,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  TrendingUp,
  MessageSquareWarning,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchLifecycleSummary, type LifecycleKind } from "@/lib/frappe/lifecycle";

export const metadata = { title: "Employee Lifecycle · Colossal HR" };

const KIND_META: Record<
  LifecycleKind,
  { label: string; icon: typeof UserPlus; blurb: string }
> = {
  onboarding: {
    label: "Onboarding",
    icon: UserPlus,
    blurb: "Welcome runs, paperwork, first-week tasks.",
  },
  separation: {
    label: "Separation",
    icon: UserMinus,
    blurb: "Exit interviews, asset handover, final settlement.",
  },
  transfer: {
    label: "Transfer",
    icon: ArrowRightLeft,
    blurb: "Cross-department or cross-company moves.",
  },
  promotion: {
    label: "Promotion",
    icon: TrendingUp,
    blurb: "Pay-grade and designation changes.",
  },
  grievance: {
    label: "Grievance",
    icon: MessageSquareWarning,
    blurb: "Raised concerns and their investigation trail.",
  },
};

const ORDER: LifecycleKind[] = [
  "onboarding",
  "separation",
  "transfer",
  "promotion",
  "grievance",
];

export default async function LifecycleHubPage() {
  const summary = await fetchLifecycleSummary();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={GitBranch}
        crumb="Employee · Lifecycle"
        title="Employee lifecycle"
        subtitle="Onboarding through separation — every transition the workforce goes through."
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Latest</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ORDER.map((k) => {
                const m = KIND_META[k];
                const s = summary[k];
                const Icon = m.icon;
                const href = `/employee/lifecycle/${k}` as Route;
                return (
                  <TableRow key={k} className="group">
                    <TableCell className="align-top font-medium">
                      <Link
                        href={href}
                        className="flex items-center gap-2 text-foreground hover:underline"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        {m.label}
                      </Link>
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      <Link href={href} className="block">
                        {m.blurb}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <Link href={href} className="block font-semibold">
                        {s.total.toLocaleString()}
                      </Link>
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      <Link href={href} className="block truncate">
                        {s.latest?.employeeName ?? s.latest?.employee ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <Link
                        href={href}
                        className="inline-flex text-muted-foreground group-hover:text-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
