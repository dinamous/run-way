import { useState, useEffect } from "react";

function resolveInitialDarkMode(): boolean {
  const stored = localStorage.getItem("theme");
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Manages the app-wide dark mode state.
 * Syncs with `localStorage` and applies the `dark` class to `<html>`.
 */
export function useAppTheme() {
  const [darkMode, setDarkMode] = useState(resolveInitialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleDark = () => setDarkMode((prev) => !prev);

  return { darkMode, toggleDark };
}
