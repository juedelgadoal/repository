import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces (dark control-tower theme)
        base: {
          900: "#070b14",
          800: "#0b1120",
          700: "#0f172a",
          600: "#131c31",
          500: "#1b2740",
        },
        line: "#1e293b",
        // Semantic operational colors
        brand: {
          DEFAULT: "#22d3ee",
          soft: "#0e7490",
        },
        ok: "#22c55e",
        warn: "#f59e0b",
        crit: "#ef4444",
        info: "#3b82f6",
        purple: "#a855f7",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -4px rgba(34,211,238,0.45)",
        "glow-crit": "0 0 20px -2px rgba(239,68,68,0.55)",
        "glow-warn": "0 0 18px -3px rgba(245,158,11,0.5)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.85)", opacity: "0.8" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.8s ease-out infinite",
        fadeIn: "fadeIn 0.35s ease-out",
        slideIn: "slideIn 0.3s ease-out",
        blink: "blink 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
