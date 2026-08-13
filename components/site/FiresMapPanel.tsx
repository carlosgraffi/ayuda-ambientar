"use client";

import dynamic from "next/dynamic";

/**
 * Leaflet toca `window` al importarse, así que el mapa entra sin SSR y en
 * su propio chunk: son ~45 KB que no tienen por qué estar en la carga
 * inicial de una página a la que la gente llega para copiar un alias.
 */
export const FiresMapPanel = dynamic(
  () => import("./FiresMap").then((m) => m.FiresMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-[var(--r-card)]"
        style={{ height: 420, background: "var(--bg-sunken)" }}
        aria-busy="true"
      />
    ),
  },
);
