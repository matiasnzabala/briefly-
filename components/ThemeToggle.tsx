"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "briefly:theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    const initial: Theme = stored === "light" || stored === "dark" ? stored : "dark";
    setTheme(initial);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(THEME_KEY, next);
  }

  if (!mounted) return <span className="w-8 h-8 shrink-0" />;

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm transition"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
