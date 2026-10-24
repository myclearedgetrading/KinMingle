import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3eee6",
        card: "#fffdf9",
        ink: "#1c1915",
        muted: "#6f675e",
        line: "#e4dcd0",
        terra: "#c4552a",
        pine: "#2f5d50",
        night: "#14110e",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 16px 40px rgba(68, 44, 20, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
