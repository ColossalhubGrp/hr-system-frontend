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
        // -- Existing brand tokens (preserved 1:1) ----------------------------
        // Sidebar / brand purple — matched to the mockups.
        ink: {
          50: "#EEF0FB",
          100: "#D6D9F1",
          200: "#A8AEE0",
          300: "#7A82CF",
          400: "#5057BE",
          500: "#373389",
          600: "#2C2974",
          700: "#252263",
          800: "#1E1B53",
          900: "#161341",
        },
        // Neutral surfaces.
        canvas: "#F4F5FA",
        surface: "#FFFFFF",
        hairline: "#E6E8EE",
        ash: {
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          900: "#11142A",
        },
        // Trend semantics.
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
        card: "0 1px 2px rgba(17, 20, 42, 0.04), 0 4px 16px rgba(17, 20, 42, 0.04)",
        rail: "0 8px 32px rgba(22, 19, 65, 0.18)",
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
