import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        text: "var(--text)",
        "text-soft": "var(--text-soft)",
        border: "var(--border)",
        petrol: "var(--petrol)",
        "petrol-soft": "var(--petrol-soft)",
        violet: "var(--violet)",
        jade: "var(--jade)",
        amber: "var(--amber)",
        "amber-soft": "var(--amber-soft)",
      },
      fontFamily: {
        display: ["var(--font-manrope)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jakarta)", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.375rem",
      },
      boxShadow: {
        soft: "0 14px 36px -16px rgba(16, 21, 27, 0.18)",
        "soft-dark": "0 14px 36px -16px rgba(0, 0, 0, 0.6)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%": { transform: "scale(0.85)", opacity: "1" },
          "70%": { transform: "scale(1.25)", opacity: "0" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fadeUp 560ms cubic-bezier(.4,0,.2,1) both",
        pulse: "pulse 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
