import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          glow: "rgba(94, 234, 212, 0.4)",
          dim: "rgba(94, 234, 212, 0.15)",
          border: "rgba(94, 234, 212, 0.35)",
        },
        navy: {
          dark: "#0f172a",
          mid: "#1e293b",
          card: "rgba(30, 41, 59, 0.6)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
