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
        // -- Brand palette — matched 2026-10-06 to the Colossal Hub
        //    public site (colossal-hub repo, src/app/globals.css):
        //      --color-primary       #2563EB (Tailwind blue-600)
        //      --color-primary-dark  #1D4ED8 (Tailwind blue-700)
        //    plus the Tailwind slate ramp for neutrals.
        //
        //    The `ink` scale is kept by name for backwards compatibility
        //    (hundreds of ink-800/ink-700 class references across the
        //    codebase). The values now map to the Tailwind blue ramp,
        //    anchored so that `ink-800` renders as the website's primary
        //    and `ink-700` renders as its primary-dark (hover state).
        //    That makes the existing `bg-ink-800 hover:bg-ink-700`
        //    pattern go darker on hover, matching the site's own
        //    primary → primary-dark interaction.
        ink: {
          50:  "#EFF6FF",   // blue-50   — subtle accent backgrounds
          100: "#DBEAFE",   // blue-100
          200: "#BFDBFE",   // blue-200
          300: "#93C5FD",   // blue-300
          400: "#60A5FA",   // blue-400
          500: "#3B82F6",   // blue-500
          600: "#2563EB",   // blue-600  — brand primary (same as 800)
          700: "#1D4ED8",   // blue-700  — brand primary-dark (hover)
          800: "#2563EB",   // brand primary — most-used token
          900: "#1E3A8A",   // blue-900  — deepest, used for sidebar
        },
        // Neutral surfaces — swapped from purple-tinted to slate
        // ramp so they sit under the blue brand cleanly.
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
        // Shadows re-tuned to the slate / blue family. The rail
        // shadow sits under the brand sidebar so it carries a hint of
        // blue instead of purple.
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.04)",
        rail: "0 8px 32px rgba(30, 58, 138, 0.18)",
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
