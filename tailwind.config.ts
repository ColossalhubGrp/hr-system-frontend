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
        // Brand `ink` scale — stays constant across themes (navy is
        // navy in light + dark). Backed by CSS vars so if we ever
        // need a theme-specific tweak, it's one file. Alpha works
        // via the slash-syntax: `bg-ink-800/40`.
        ink: {
          50:  "rgb(var(--ink-50) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",   // brand primary
          900: "rgb(var(--ink-900) / <alpha-value>)",
        },
        // Mint accent — also constant across themes.
        mint: {
          50:  "rgb(var(--mint-50) / <alpha-value>)",
          100: "rgb(var(--mint-100) / <alpha-value>)",
          200: "rgb(var(--mint-200) / <alpha-value>)",
          300: "rgb(var(--mint-300) / <alpha-value>)",
          400: "rgb(var(--mint-400) / <alpha-value>)",   // brand accent
          500: "rgb(var(--mint-500) / <alpha-value>)",
          600: "rgb(var(--mint-600) / <alpha-value>)",
          700: "rgb(var(--mint-700) / <alpha-value>)",
          800: "rgb(var(--mint-800) / <alpha-value>)",
          900: "rgb(var(--mint-900) / <alpha-value>)",
        },
        // Semantic surfaces — FLIP in dark mode. `bg-canvas` is
        // slate-50 in light / near-black navy in dark. `bg-surface`
        // is the raised card ground. `border-hairline` is the
        // subdued divider that works on both.
        canvas:   "rgb(var(--canvas) / <alpha-value>)",
        surface:  "rgb(var(--surface) / <alpha-value>)",
        hairline: "rgb(var(--hairline) / <alpha-value>)",
        // Ash text scale — FLIPS in dark mode. ash-500 stays "the
        // muted body-copy colour on this ground" in either theme.
        ash: {
          100: "rgb(var(--ash-100) / <alpha-value>)",
          200: "rgb(var(--ash-200) / <alpha-value>)",
          300: "rgb(var(--ash-300) / <alpha-value>)",
          400: "rgb(var(--ash-400) / <alpha-value>)",
          500: "rgb(var(--ash-500) / <alpha-value>)",
          600: "rgb(var(--ash-600) / <alpha-value>)",
          700: "rgb(var(--ash-700) / <alpha-value>)",
          800: "rgb(var(--ash-800) / <alpha-value>)",
          900: "rgb(var(--ash-900) / <alpha-value>)",
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
