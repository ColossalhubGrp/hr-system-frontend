import Link from "next/link";
import type { Route } from "next";
import {
  ShoppingBag,
  Truck,
  Layers,
  ReceiptText,
  Wallet,
  FileInput,
  BarChart3,
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

export const metadata = { title: "Buying · Colossal HR" };
export const dynamic = "force-dynamic";

type Row = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  status: "live" | "pending";
};

type Section = { id: string; label: string; subtitle: string; rows: Row[] };

const SECTIONS: Section[] = [
  {
    id: "shortcuts",
    label: "Shortcuts",
    subtitle: "Everyday actions — suppliers, bills, payments.",
    rows: [
      { label: "Suppliers", href: "/buying/suppliers", icon: Truck, desc: "The list of parties you buy from. Purchase Invoices and payments key off this.", status: "live" },
      { label: "Purchase Invoice", href: "/accounting/purchase-invoices", icon: ReceiptText, desc: "Record supplier bills and track outstanding payables.", status: "live" },
      { label: "Payment Entry", href: "/accounting/payment-entries", icon: Wallet, desc: "Pay a supplier and match the payment to the bills it settles.", status: "live" },
      { label: "Accounts Payable", href: "/accounting/reports/accounts-payable", icon: FileInput, desc: "Who you owe, aged into 30 / 60 / 90 / 120-day buckets.", status: "live" },
    ],
  },
  {
    id: "suppliers",
    label: "Suppliers",
    subtitle: "The people and companies you buy from.",
    rows: [
      { label: "Suppliers", href: "/buying/suppliers", icon: Truck, desc: "Create, edit and browse individual supplier records.", status: "live" },
      { label: "Supplier Groups", href: "/buying/supplier-groups", icon: Layers, desc: "Buckets suppliers belong to (Materials, Services, Utilities…) — used for reporting.", status: "live" },
    ],
  },
  {
    id: "transactions",
    label: "Transactions",
    subtitle: "What you record from suppliers and what you send them.",
    rows: [
      { label: "Purchase Invoice", href: "/accounting/purchase-invoices", icon: ReceiptText, desc: "Bills from suppliers. Lives under Accounting; linked here for convenience.", status: "live" },
      { label: "Payment Entry", href: "/accounting/payment-entries", icon: Wallet, desc: "Payments to suppliers, allocated against their bills.", status: "live" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    subtitle: "How much is owed and to whom.",
    rows: [
      { label: "Accounts Payable", href: "/accounting/reports/accounts-payable", icon: FileInput, desc: "Money you owe suppliers, aged into 30 / 60 / 90 / 120-day buckets.", status: "live" },
      { label: "General Ledger", href: "/accounting/reports/general-ledger", icon: BarChart3, desc: "Every posting — filter by a supplier's payable account to see their history.", status: "live" },
    ],
  },
];

export default function BuyingLandingPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShoppingBag className="h-3.5 w-3.5" />
          Buying
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Buying
        </h1>
        <p className="text-sm text-muted-foreground">
          Suppliers, purchase invoices and payments — everything on the way out.
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
