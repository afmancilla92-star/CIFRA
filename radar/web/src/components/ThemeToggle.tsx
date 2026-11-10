"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggle() {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("radar-theme", dark ? "dark" : "light");
    } catch {
      /* almacenamiento no disponible */
    }
  }
  return (
    <button type="button" onClick={toggle} className="btn-ghost px-2 py-1.5" aria-label="Cambiar tema">
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="h-4 w-4 dark:hidden" />
    </button>
  );
}
