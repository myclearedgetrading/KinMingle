"use client";

import { useEffect, useState } from "react";

const KEY = "kinmingle-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(KEY, next);
    setTheme(next);
  }

  const light = theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={light}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
      className={`inline-flex items-center gap-2 rounded-full border border-line bg-card/80 px-3 py-1.5 text-xs font-semibold text-ink backdrop-blur ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-terra" aria-hidden />
      {light ? "Light" : "Dark"}
    </button>
  );
}
