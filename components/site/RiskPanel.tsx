"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { num } from "@/lib/format";

/**
 * Lo que se sabe del riesgo ANTES de que haya fuego.
 *
 * La distinción que ordena todo el componente:
 *
 * · El nivel de GDACS es un instrumento OFICIAL. Se replica con su color y
 *   su nombre, verde incluido — y el verde está prohibido en la rampa de
 *   riesgo propia del sistema justamente para que, cuando aparezca, se lea
 *   como lo que es: la escala de otro, no la nuestra.
 *
 * · Las condiciones meteorológicas son condiciones. Temperatura, humedad,
 *   viento y lluvia no son un índice de peligro, y presentarlas como si lo
 *   fueran sería inventar un instrumento. El índice oficial existe —el FWI
 *   de Copernicus— pero su capa no se puede consultar por punto, así que
 *   se enlaza en vez de estimarlo.
 */

/** Colores oficiales de GDACS. Se reproducen exactos, como los de marca. */
const NIVEL_GDACS: Record<string, { fondo: string; texto: string; label: string }> = {
  Green: { fondo: "#E3F5E9", texto: "#14532D", label: "Verde" },
  Orange: { fondo: "#FFEDD5", texto: "#7C2D12", label: "Naranja" },
  Red: { fondo: "#FEE2E2", texto: "#7F1D1D", label: "Rojo" },
};

interface Dia {
  dia: string;
  tempMax: number;
  humedadMin: number;
  vientoMax: number;
  lluvia: number;
}

interface Datos {
  alertas: { nivel: string; nombre: string; pais: string; desde: string; url: string | null }[] | null;
  condiciones: Dia[] | null;
  fallas: string[];
  fuentes: Record<string, { nombre: string; url: string; nota: string }>;
}

export function RiskPanel({ campaign }: { campaign: string }) {
  const [d, setD] = useState<Datos | null>(null);
  const [falla, setFalla] = useState(false);

  useEffect(() => {
    fetch(`/data/riesgo-${campaign}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then(setD)
      .catch(() => setFalla(true));
  }, [campaign]);

  if (falla || (d && !d.alertas && !d.condiciones)) {
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
          No hay datos de riesgo disponibles en este momento.
        </p>
      </div>
    );
  }

  if (!d) {
    return (
      <div
        className="rounded-[var(--r-card)]"
        style={{ height: 180, background: "var(--bg-sunken)" }}
        aria-busy="true"
      />
    );
  }

  const hoy = d.condiciones?.[0];

  return (
    <div className="flex flex-col gap-5">
      {/* Alertas oficiales, si las hay. */}
      {d.alertas && d.alertas.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {d.alertas.map((a) => {
            const c = NIVEL_GDACS[a.nivel] ?? NIVEL_GDACS.Green;
            return (
              <li key={a.nombre + a.desde} className="card flex flex-col gap-2">
                <span
                  className="badge self-start"
                  style={{ background: c.fondo, color: c.texto }}
                >
                  Alerta {c.label} · GDACS
                </span>
                <p style={{ color: "var(--text-strong)" }}>{a.nombre}</p>
                {a.url && (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm">
                    Ver el informe oficial
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        d.alertas && (
          <p style={{ color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text-strong)" }}>
              Sin alertas oficiales de incendio en la zona.
            </strong>{" "}
            Lo informa GDACS, el sistema de alerta de la Comisión Europea y la
            ONU. Que no haya alerta no significa que no pueda haber fuego:
            significa que ninguno alcanzó el umbral que ellos miden.
          </p>
        )
      )}

      {/* Condiciones. Nunca presentadas como un índice. */}
      {hoy && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Dato etiqueta="Temperatura" valor={`${num(hoy.tempMax)}°`} pie="máxima de hoy" />
            <Dato etiqueta="Humedad" valor={`${num(hoy.humedadMin)}%`} pie="mínima de hoy" />
            <Dato etiqueta="Viento" valor={num(hoy.vientoMax)} pie="km/h, máxima" />
            <Dato etiqueta="Lluvia" valor={num(hoy.lluvia)} pie="mm en el día" />
          </div>

          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Son <strong>condiciones meteorológicas, no un índice de peligro</strong>.
            Calor, sequedad y viento hacen que el fuego avance más rápido, pero
            un índice serio pesa muchas más cosas. El oficial es el Fire Weather
            Index de Copernicus:{" "}
            <a
              href={d.fuentes.fwi.url}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap"
            >
              ver el mapa
              <ExternalLink
                size={13}
                strokeWidth={1.75}
                aria-hidden
                style={{ display: "inline", verticalAlign: "-1px", marginLeft: 4 }}
              />
            </a>
            . Datos de {d.fuentes.openMeteo.nombre}.
          </p>
        </div>
      )}

      {d.fallas.length > 0 && (
        <p className="text-sm" style={{ color: "var(--text-faint)" }}>
          Alguna fuente no respondió al momento de publicar esta página.
        </p>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor, pie }: { etiqueta: string; valor: string; pie: string }) {
  return (
    <div className="metric metric-sm">
      <p className="metric-label">{etiqueta}</p>
      <p className="metric-value">{valor}</p>
      <p className="metric-sub">{pie}</p>
    </div>
  );
}
