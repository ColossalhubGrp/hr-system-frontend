import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, NO_FLASH_SCRIPT } from "@/components/theme/theme-provider";
import "./globals.css";

// Official rsms Inter, self-hosted: Google's build strips the
// stylistic sets (ss01/cv05/cv11) that globals.css switches on, so
// with next/font/google the brand letterforms only appeared on
// machines with the desktop Inter installed locally.
const inter = localFont({
  src: [
    { path: "./fonts/InterVariable.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/InterVariable-Italic.woff2", weight: "100 900", style: "italic" },
  ],
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
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
