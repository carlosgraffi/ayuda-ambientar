"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { brand } from "@/lib/brand";
import { VERIFICATION_LABEL } from "@/lib/types";

/**
 * El contenido del widget embebible: un listado compacto que un diario o
 * un municipio incrusta con una línea de script.
 *
 * Lee la API pública desde el cliente — el mismo contrato que cualquier
 * consumidor externo, sin camino privilegiado. La atribución del pie no
 * es configurable: si estos datos aparecen en otro sitio, se sabe de
 * dónde salen y dónde está la versión completa.
 */

interface Entidad {
  slug: string;
  name: string;
  locality: string | null;
  province: string | null;
  verification_level: 1 | 2;
  holder_name: string | null;
  org_channels: { identifier: string }[];
  avales: unknown[];
}

function Listado() {
  const q = useSearchParams();
  const [entidades, setEntidades] = useState<Entidad[] | null>(null);
  const [falla, setFalla] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.get("event")) params.set("event", q.get("event")!);
    if (q.get("province")) params.set("province", q.get("province")!);
    fetch(`/api/v1/entities?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setEntidades(d.data))
      .catch(() => setFalla(true));
  }, [q]);

  useEffect(() => {
    // Avisar la altura al anfitrión, para que el iframe no recorte.
    const avisar = () =>
      window.parent?.postMessage(
        { ayudaWidgetHeight: document.documentElement.scrollHeight },
        "*",
      );
    avisar();
    const obs = new ResizeObserver(avisar);
    obs.observe(document.body);
    return () => obs.disconnect();
  }, [entidades]);

  return (
    <div className="flex flex-col gap-3" style={{ padding: 16 }}>
      {falla ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Sin datos en este momento. El listado completo está en{" "}
          <a href={brand.url} target="_blank" rel="noopener noreferrer">
            {brand.name}
          </a>
          .
        </p>
      ) : entidades === null ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando…</p>
      ) : entidades.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No hay entidades publicadas para este filtro.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entidades.map((e) => (
            <li
              key={e.slug}
              className="flex flex-col gap-1 rounded-[14px] p-3"
              style={{ border: "1px solid var(--border-hairline)" }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <a
                  href={`${brand.url}/e/${e.slug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--text-strong)", fontWeight: 600 }}
                >
                  {e.name}
                </a>
                <span
                  className="badge shrink-0"
                  style={
                    e.verification_level === 2
                      ? { background: "var(--verde-50)", color: "var(--verde-700)" }
                      : { background: "var(--riesgo-2-soft)", color: "#92400e" }
                  }
                >
                  {VERIFICATION_LABEL[e.verification_level]}
                </span>
              </div>
              {e.org_channels[0] && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Alias: <span className="alias">{e.org_channels[0].identifier}</span>
                  {e.holder_name && ` · ${e.holder_name}`}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* La atribución: siempre visible, en todos los breakpoints. */}
      <footer
        className="flex items-center justify-between gap-2 pt-2"
        style={{ borderTop: "1px solid var(--border-hairline)" }}
      >
        <a
          href={brand.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm"
          style={{ fontWeight: 600 }}
        >
          ayuda.ambient.ar
        </a>
        <span className="text-sm" style={{ color: "var(--text-faint)" }}>
          de Rediseñ.ar y ambient.ar
        </span>
      </footer>
    </div>
  );
}

export default function Widget() {
  return (
    <Suspense>
      <Listado />
    </Suspense>
  );
}
