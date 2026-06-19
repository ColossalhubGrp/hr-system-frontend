import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Colossal HR",
    template: "%s · Colossal HR",
  },
  description: "Human resources workspace for Colossal Hub.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1E1B53",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        {/* Radix Tooltip primitives require a TooltipProvider ancestor to
            read open/close timing config from context. The recruitment-app
            pages use bare <Tooltip> assuming this provider exists at the
            root — installing it here once covers every page in the app. */}
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
