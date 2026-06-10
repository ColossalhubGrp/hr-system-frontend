import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        card: "20px",
        chip: "999px",
      },
      fontSize: {
        kpi: ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
      },
    },
  },
  plugins: [],
};

export default config;
