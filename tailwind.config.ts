import type { Config } from "tailwindcss";

const config: Config = {
  // shadcn/ui ships dark-mode primitives by default. Driven via the `dark`
  // class so it composes with the existing brand colours below.
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // -- Brand palette — matched 2026-10-12 to the official
        //    Colossal Hub brand pack. Primary is a deep muted navy
        //    (sampled from the logo ring + wordmark); the mint green
        //    on the C letter is the accent.
        //
        //    Navy  #203060   (ring, wordmark, primary buttons)
        //    Mint  #88D0B8   (C letter, accent chips, "live" dots)
        //
        //    The `ink` scale is kept by name for backwards compat
        //    (hundreds of ink-800/ink-700 class references across the
        //    codebase). Values anchored so `ink-800` renders as the
        //    exact brand navy and `ink-700` a slightly darker shade for
        //    hover. 50-600 fill in a ramp around the brand navy; 900
        //    is the deepest for sidebar / high-contrast surfaces.
        ink: {
          50:  "#E8ECF4",   // palest navy tint — subtle accent bg
          100: "#C8D0E0",
          200: "#9AA6C4",
          300: "#6B7CA8",
          400: "#4C5F8E",
          500: "#334678",
          600: "#243666",   // just below primary
          700: "#1A2850",   // brand primary-dark (hover state)
          800: "#203060",   // BRAND PRIMARY — official navy
          900: "#141E42",   // deepest; sidebar + high-contrast surfaces
        },
        // Mint accent — new in the 2026-10-12 rebrand. Used for
        // "live" indicator dots, subtle hover accents, and anywhere
        // we want a soft callout that isn't the primary brand navy.
        mint: {
          50:  "#F0FAF5",
          100: "#DAF2E6",
          200: "#BDE6D1",
          300: "#9FDAC0",
          400: "#88D0B8",   // BRAND ACCENT — mint green from the C
          500: "#6CBFA4",
          600: "#4FA98B",
          700: "#3C8E73",
          800: "#2C6D59",
          900: "#1F4F40",
        },
        // Neutral surfaces — slate ramp (unchanged from Oct-06).
        canvas: "#F8FAFC",   // slate-50
        surface: "#FFFFFF",
        hairline: "#E2E8F0", // slate-200
        ash: {
          400: "#94A3B8",    // slate-400
          500: "#64748B",    // slate-500
          600: "#475569",    // slate-600
          700: "#334155",    // slate-700
          900: "#0F172A",    // slate-900
        },
        // Trend semantics — unchanged. Green = up, red = down.
        rise: "#22C55E",
        fall: "#EF4444",

        // Tailwind's own `blue-*` scale is REDEFINED to the brand
        // navy ramp. Status chips scattered across the app (payroll
        // "Processed", analytics "Candidate" / "int type") used raw
        // `bg-blue-100`, `text-blue-700`, `bg-blue-500` — those are
        // semantic badges, not brand accents, but letting them stay
        // the stock Tailwind blue clashes with the brand navy
        // everywhere else. Remap so every `*-blue-N` across the app
        // (and anything a future contributor writes) tracks the
        // official brand, without needing to find and rewrite each
        // badge. blue-600 lands exactly on the brand primary.
        blue: {
          50:  "#E8ECF4",
          100: "#D1D8E8",
          200: "#A3B1D1",
          300: "#7589B5",
          400: "#4F6598",
          500: "#334678",
          600: "#203060",   // brand navy
          700: "#1A2850",
          800: "#141F42",
          900: "#0E1733",
          950: "#080E22",
        },

        // -- shadcn/ui semantic tokens --------------------------------------
        // These read from CSS variables defined in globals.css. Each one is
        // mapped to a brand value so shadcn components inherit the existing
        // ink/canvas/surface palette instead of zinc.
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        // Shadows carry a hint of the brand navy under the sidebar
        // and cards. Card shadow stays slate-neutral so it reads as
        // depth, not colour.
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.04)",
        rail: "0 8px 32px rgba(32, 48, 96, 0.22)",
      },
      borderRadius: {
        // -- Existing brand-specific radii (preserved) ----------------------
        card: "20px",
        chip: "999px",
        // -- shadcn's CSS-variable-driven radii -----------------------------
        // These bind to --radius for the standard shadcn primitives.
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontSize: {
        kpi: ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
