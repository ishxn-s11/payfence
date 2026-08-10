import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#101421",
        brand: {
          50: "#fdf0f6",
          100: "#fbd4e6",
          200: "#f8a2d3",
          300: "#f480c0",
          500: "#ff488b",
          600: "#f6186a",
          700: "#d4115a",
        },
        // Override Tailwind's default pink with the Cerebrium pink scale.
        pink: {
          100: "#fdcdeb",
          200: "#f8a2d3",
          300: "#f480c0",
          400: "#ff6aa3",
          500: "#ff488b",
          600: "#f6186a",
          700: "#d4115a",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        display: [
          "var(--font-space-grotesk)",
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
