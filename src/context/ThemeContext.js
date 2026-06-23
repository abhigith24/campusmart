import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

const getInitialThemeMode = () => {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem("themeMode") || window.localStorage.getItem("theme");
    if (saved) return saved;
  }
  return "system";
};

const getSystemTheme = () => {
  if (typeof window !== "undefined") {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    if (media.matches) return "dark";
  }
  return "light";
};

// Synchronously set initial theme to avoid flashes on refresh
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const mode = getInitialThemeMode();
  const initialTheme = mode === "system" ? getSystemTheme() : mode;
  document.documentElement.setAttribute("data-theme", initialTheme);
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(getInitialThemeMode());
  const [theme, setTheme] = useState(() => {
    const mode = getInitialThemeMode();
    return mode === "system" ? getSystemTheme() : mode;
  });

  useEffect(() => {
    let activeTheme = themeMode;
    if (themeMode === "system") {
      activeTheme = getSystemTheme();
    }

    setTheme(activeTheme);
    document.documentElement.setAttribute("data-theme", activeTheme);
    window.localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (themeMode !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      const activeTheme = e.matches ? "dark" : "light";
      setTheme(activeTheme);
      document.documentElement.setAttribute("data-theme", activeTheme);
    };

    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [themeMode]);

  const toggleTheme = () => {
    // Keep toggleTheme for backward compatibility: toggles between light and dark explicitly
    const nextTheme = theme === "light" ? "dark" : "light";
    setThemeMode(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
