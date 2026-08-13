"use client";

import { useEffect, useRef, useState } from "react";
import type { CircleMarker, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { num, relativeTime } from "@/lib/format";

/**
 * Leaflet pinta los círculos con atributos de presentación SVG, que no
 * resuelven `var()`. Estos valores son los mismos de la rampa de riesgo de
 * `globals.css` (--riesgo-3 y --riesgo-5), copiados a mano por esa razón.
 * El verde nunca aparece en la rampa.
 */
const RIESGO_3 = "#f97316";
const RIESGO_5 = "#b91c1c";

/**
 * Mapa de focos activos.
 *
 * Lee un GeoJSON estático que `scripts/fetch-focos.mjs` escribe en el
 * build. Nunca llama a la NASA desde el navegador — así la API key no
 * existe del lado del cliente (en el repo viejo estaba escrita en el
 * componente, o sea publicada) y un pico de tráfico no multiplica las
 * llamadas a la API.
 *
 * VIIRS son satélites de órbita polar: mucha precisión espacial (375 m)
 * pero sólo dos o tres pasadas por día. La etiqueta lo dice, en vez de
 * simular tiempo real. En F5 se suma la capa geoestacionaria de GOES, que
 * actualiza cada 10 minutos con menos resolución, y las dos conviven
 * etiquetadas distinto.
 */

interface Foco {
  lat: number;
  lon: number;
  confidence: string;
  brightness: number | null;
  observedAt: string;
}

interface Datos {
  status: "ok" | "sin-detecciones" | "sin-senal";
  reason?: string;
  fetchedAt: string | null;
  focos: Foco[];
  source: { name: string; product: string; url: string };
  windowDays: number;
}

function useFocos(slug: string) {
  const [datos, setDatos] = useState<Datos | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/data/focos-${slug}.geojson`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((doc) => {
        if (!vivo) return;
        setDatos({
          status: doc.metadata.status,
          reason: doc.metadata.reason,
          fetchedAt: doc.metadata.fetchedAt,
          source: doc.metadata.source,
          windowDays: doc.metadata.windowDays,
          focos: doc.features.map((f: any) => ({
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            ...f.properties,
          })),
        });
      })
      .catch((err) => {
        if (!vivo) return;
        // Que no haya archivo es en sí una lectura: no hay señal.
        setDatos({
          status: "sin-senal",
          reason: `No se pudo leer la capa de focos: ${err.message}`,
          fetchedAt: null,
          focos: [],
          source: {
            name: "NASA FIRMS",
            product: "VIIRS",
            url: "https://firms.modaps.eosdis.nasa.gov/",
          },
          windowDays: 3,
        });
      });
    return () => {
      vivo = false;
    };
  }, [slug]);

  return datos;
}

/** Los basemaps de CARTO siguen los neutros del sistema en ambos temas. */
const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

export function FiresMap({ slug, center }: { slug: string; center: [number, number] }) {
  const datos = useFocos(slug);
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!datos || datos.status !== "ok" || !contenedor.current || mapa.current) return;

    let cancelado = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !contenedor.current) return;

      const map = L.map(contenedor.current, {
        center,
        zoom: 6,
        scrollWheelZoom: false, // no secuestrar el scroll de la página
        attributionControl: true,
      });
      mapa.current = map;

      const tema = () =>
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "dark"
          : "light";

      let capa = L.tileLayer(TILES[tema()], {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 12,
      }).addTo(map);

      // El basemap sigue al tema sin recargar la página.
      const observador = new MutationObserver(() => {
        capa.remove();
        capa = L.tileLayer(TILES[tema()], {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 12,
        }).addTo(map);
      });
      observador.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });

      const puntos: CircleMarker[] = [];
      for (const f of datos.focos) {
        const alta = f.confidence === "h";
        const color = alta ? RIESGO_5 : RIESGO_3;
        const marca = L.circleMarker([f.lat, f.lon], {
          radius: alta ? 7 : 5,
          color,
          fillColor: color,
          fillOpacity: 0.45,
          weight: 1.5,
        }).addTo(map);
        marca.bindPopup(
          `<strong>Detección ${alta ? "de alta" : "de"} confianza</strong><br>` +
            `${f.observedAt.slice(0, 10)}<br>` +
            `${f.lat.toFixed(3)}, ${f.lon.toFixed(3)}`,
        );
        puntos.push(marca);
      }

      if (puntos.length) {
        map.fitBounds(L.featureGroup(puntos).getBounds().pad(0.25));
      }

      return () => observador.disconnect();
    })();

    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
    };
  }, [datos, center]);

  if (!datos) {
    return (
      <div
        className="rounded-[var(--r-card)]"
        style={{ height: 420, background: "var(--bg-sunken)" }}
        aria-busy="true"
      />
    );
  }

  /**
   * "Sin señal" es un estado de primera clase, nunca un vacío. No hay
   * skeleton infinito ni un mapa mudo: se dice qué falta y por qué. La
   * ausencia de detecciones no significa que no haya fuego.
   */
  if (datos.status !== "ok") {
    return (
      <div
        className="flex flex-col gap-2 rounded-[var(--r-card)] p-6"
        style={{
          border: "1px dashed var(--border-strong)",
          background: "var(--surface-card-subtle)",
        }}
      >
        <p className="eyebrow">Sin señal</p>
        <p style={{ color: "var(--text-body)" }}>
          {datos.status === "sin-detecciones"
            ? `${datos.source.name} no reporta focos de calor en la zona en los últimos ${datos.windowDays} días.`
            : "No hay datos de focos activos en este momento."}
        </p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Que no haya detecciones no significa que no haya fuego: significa
          que no hay reportes. Los satélites no ven a través de las nubes y
          pasan pocas veces por día.
        </p>
        {/* `datos.reason` queda en el JSON y en el log del build, no en la
            página: a quien entra a donar, "no se configuró FIRMS_API_KEY"
            no le dice nada y le resta confianza al resto del contenido. */}
      </div>
    );
  }

  return (
    <figure className="flex flex-col gap-3">
      <div
        ref={contenedor}
        className="rounded-[var(--r-card)]"
        style={{
          height: 420,
          border: "1px solid var(--border-hairline)",
          zIndex: 0,
        }}
        role="img"
        aria-label={`Mapa con ${datos.focos.length} focos de calor detectados en los últimos ${datos.windowDays} días`}
      />
      <figcaption
        className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        <span style={{ color: "var(--text-strong)" }}>
          <strong className="num">{num(datos.focos.length)}</strong> focos de
          calor
        </span>
        <span>· últimos {datos.windowDays} días ·</span>
        <a href={datos.source.url} target="_blank" rel="noopener noreferrer">
          {datos.source.name} {datos.source.product}
        </a>
        {datos.fetchedAt && (
          <span>
            · datos de la última publicación, {relativeTime(datos.fetchedAt)}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
