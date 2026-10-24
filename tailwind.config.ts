import type { Config } from "tailwindcss";

function tone(name: string) {
  return `rgb(var(--${name}) / <alpha-value>)`;
}

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: tone("paper"),
        card: tone("card"),
        ink: tone("ink"),
        muted: tone("muted"),
        line: tone("line"),
        blush: tone("blush"),
        pine: "#0057E7",
        terra: "#0057E7",
        night: "#071B4D",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "var(--shadow)",
      },
    },
  },
  plugins: [],
};

export default config;
