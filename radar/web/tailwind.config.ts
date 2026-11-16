import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        soft: "rgb(var(--text-soft) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        "accent-text": "rgb(var(--accent-text) / <alpha-value>)",
        amber: "rgb(var(--amber) / <alpha-value>)",
        "amber-soft": "rgb(var(--amber-soft) / <alpha-value>)",
        good: "rgb(var(--good) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        soft: "0 10px 30px -18px rgba(16, 21, 27, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
