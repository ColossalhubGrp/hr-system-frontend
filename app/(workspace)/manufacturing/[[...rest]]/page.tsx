import { Factory } from "lucide-react";
import { ComingSoon } from "@/components/common/coming-soon";

export const metadata = { title: "Manufacturing · Coming soon · Colossal Suite" };

export default function ManufacturingComingSoonPage() {
  return (
    <ComingSoon
      icon={Factory}
      title="Manufacturing"
      blurb="Plan production runs, manage bills of materials and track work from raw material to finished product."
    />
  );
}
