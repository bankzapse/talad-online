import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-noto)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#059669",
          dark: "#047857",
          darker: "#065f46",
          light: "#d1fae5",
          soft: "#ecfdf5",
        },
        gold: {
          DEFAULT: "#c99a3f",
          light: "#faf3e4",
        },
        ink: "#0b1f17",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(6,95,70,.06), 0 8px 24px -8px rgba(6,95,70,.10)",
        lift: "0 10px 40px -12px rgba(6,95,70,.28)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up .6s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
