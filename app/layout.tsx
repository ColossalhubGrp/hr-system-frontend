import type { Metadata, Viewport } from "next";
import { Cantarell } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, NO_FLASH_SCRIPT } from "@/components/theme/theme-provider";
import "./globals.css";

// Cantarell — the GNOME interface typeface (user request 2026-11-09:
// match the desktop's system font). It ships only 400 + 700; the
// browser maps the medium/semibold utility classes onto the nearest
// available weight.
const cantarell = Cantarell({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Colossal Hub",
    template: "%s · Colossal Hub",
  },
  description: "People, operations and finance in one workspace — by Colossal Hub.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // Theme-color is read by mobile browsers to tint the OS chrome.
  // Pass both so dark-mode visitors see a dark address bar.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)",  color: "#0A0F20" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cantarell.variable} suppressHydrationWarning>
      <head>
        {/* No-flash theme bootstrap. MUST run before React mounts
            so <html class="dark"> is set on the very first paint. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          {/* Radix Tooltip primitives require a TooltipProvider
              ancestor; installing it here once covers every page. */}
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
