import { Package } from "lucide-react";
import { ComingSoon } from "@/components/common/coming-soon";

export const metadata = { title: "Stock · Coming soon · Colossal Hub" };

export default function StockComingSoonPage() {
  return (
    <ComingSoon
      icon={Package}
      title="Stock"
      blurb="Track what you hold and where it moves — items, warehouses, receiving and issuing, all tied into your accounting."
    />
  );
}
