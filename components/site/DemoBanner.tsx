"use client";

import { useEffect, useState } from "react";
import { esDemo } from "@/lib/demo";

/**
 * La franja que un despliegue de demostración no puede sacarse de encima.
 * Datos ficticios que parecen reales son lo que este proyecto combate —
 * también en su propio demo.
 */
export function DemoBanner() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    void esDemo().then(setDemo);
  }, []);
  if (!demo) return null;
  return (
    <div
      className="eyebrow"
      style={{
        background: "var(--ink-900)",
        color: "var(--ink-100)",
        textAlign: "center",
        padding: "8px 16px",
      }}
    >
      Demostración · todos los datos son ficticios ·{" "}
      <a href="/tour/" style={{ color: "var(--verde-300)" }}>
        ver cómo funciona
      </a>
    </div>
  );
}
