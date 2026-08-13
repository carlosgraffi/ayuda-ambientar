"use client";

import { Moon, Sun } from "lucide-react";

/**
 * El tema real lo fija el script de `layout.tsx` antes del primer paint;
 * acá sólo se alterna. Los dos íconos están siempre en el DOM y CSS decide
 * cuál se ve (`.theme-icon-*`), así que no hay estado de React que pueda
 * desincronizarse ni parpadeo en la hidratación.
 */
export function ThemeToggle() {
  function toggle() {
    const el = document.documentElement;
    const next = el.getAttribute("data-theme") === "dark" ? "light" : "dark";
    el.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Modo privado: el tema vale para esta sesión y listo.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-secondary btn-icon btn-sm"
      aria-label="Cambiar entre tema claro y oscuro"
    >
      <span className="theme-icon theme-icon-moon">
        <Moon size={17} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="theme-icon theme-icon-sun">
        <Sun size={17} strokeWidth={1.75} aria-hidden />
      </span>
    </button>
  );
}
