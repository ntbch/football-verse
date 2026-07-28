"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { themeFromValue, type Theme } from "@/shared/lib/theme";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("football-verse-theme", theme);
  } catch {
    // Storage can be unavailable in private browsing; the current session still works.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(themeFromValue(document.documentElement.dataset.theme ?? null));
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "light" ? "dark" : "light";
      applyTheme(next);
      return next;
    });
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeToggle must be rendered inside ThemeProvider.");

  const { theme, toggleTheme } = value;
  const nextTheme = theme === "light" ? "dark" : "light";

  return (
    <button type="button" onClick={toggleTheme} aria-label={`Switch to ${nextTheme} mode`} title={`Switch to ${nextTheme} mode`} className={`theme-toggle ${className}`.trim()}>
      {theme === "light" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.41 1.41M7.05 16.95l-1.41 1.41m0-12.72 1.41 1.41m9.9 9.9 1.41 1.41M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.7 15.1A8.5 8.5 0 0 1 8.9 3.3 8.5 8.5 0 1 0 20.7 15.1Z" /></svg>
      )}
      <span>{nextTheme === "dark" ? "Dark mode" : "Light mode"}</span>
    </button>
  );
}
