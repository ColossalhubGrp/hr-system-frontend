import Link from "next/link";
import type { Route } from "next";
import {
  BarChart3,
  Users,
  Layers,
  Receipt,
  Wallet,
  FileOutput,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const metadata = { title: "Sales · Colossal HR" };
export const dynamic = "force-dynamic";

type Row = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  status: "live" | "pending";
};

type Section = {
  id: string;
  label: string;
  subtitle: string;
  rows: Row[];
};

const SECTIONS: Section[] = [
  {
    id: "shortcuts",
    label: "Shortcuts",
    subtitle: "Everyday actions — customers, invoices, receipts.",
    rows: [
      { label: "Customers", href: "/sales/customers", icon: Users, desc: "The list of parties you sell to. Sales Invoices and receipts key off this.", status: "live" },
      { label: "Sales Invoice", href: "/accounting/sales-invoices", icon: Receipt, desc: "Bill customers for goods or services with itemised lines and taxes.", status: "live" },
      { label: "Payment Entry", href: "/accounting/payment-entries", icon: Wallet, desc: "Log incoming receipts and match them to the invoices they settle.", status: "live" },
      { label: "Accounts Receivable", href: "/accounting/reports/accounts-receivable", icon: FileOutput, desc: "Who owes what, aged into 30 / 60 / 90 / 120-day buckets.", status: "live" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    subtitle: "The people and companies you sell to.",
    rows: [
      { label: "Customers", href: "/sales/customers", icon: Users, desc: "Create, edit and browse individual customer records.", status: "live" },
      { label: "Customer Groups", href: "/sales/customer-groups", icon: Layers, desc: "Buckets customers belong to (Retail, Wholesale, Government…) — used for reporting and pricing rules.", status: "live" },
    ],
  },
  {
    id: "transactions",
    label: "Transactions",
    subtitle: "What you send customers and record from them.",
    rows: [
      { label: "Sales Invoice", href: "/accounting/sales-invoices", icon: Receipt, desc: "Bills issued to customers. Lives under Accounting; linked here for convenience.", status: "live" },
      { label: "Payment Entry", href: "/accounting/payment-entries", icon: Wallet, desc: "Receipts from customers, allocated against their invoices.", status: "live" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    subtitle: "How much is owed, how it's aged, how much has been collected.",
    rows: [
      { label: "Accounts Receivable", href: "/accounting/reports/accounts-receivable", icon: FileOutput, desc: "Money owed to you, aged into 30 / 60 / 90 / 120-day buckets.", status: "live" },
      { label: "General Ledger", href: "/accounting/reports/general-ledger", icon: BarChart3, desc: "Every posting to every account — filter by a customer's receivable account to see their history.", status: "live" },
    ],
  },
];

export default function SalesLandingPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" />
          Sales
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Sales
        </h1>
        <p className="text-sm text-muted-foreground">
          Customers, sales invoices and receipts — everything on the way in.
        </p>
      </header>

      <Tabs defaultValue={SECTIONS[0].id} className="flex flex-col gap-3">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.id} value={s.id} className="text-xs sm:text-sm">
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SECTIONS.map((s) => (
          <TabsContent key={s.id} value={s.id} className="m-0">
            <SectionTable subtitle={s.subtitle} rows={s.rows} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function SectionTable({ subtitle, rows }: { subtitle: string; rows: Row[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <p className="border-b border-border px-4 py-2 text-[11px] text-muted-foreground">
          {subtitle}
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const Icon = r.icon;
              return (
                <TableRow key={`${r.href}:${r.label}`} className="group">
                  <TableCell className="align-top font-medium">
                    <Link
                      href={r.href as Route}
                      className="flex items-center gap-2 text-foreground hover:underline"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      {r.label}
                    </Link>
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    <Link href={r.href as Route} className="block">
                      {r.desc}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <Link
                      href={r.href as Route}
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
  );
}
