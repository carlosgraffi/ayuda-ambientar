import { num, fullDate } from "@/lib/format";
import type { Tenant } from "@/lib/tenants";

/**
 * Resumen de una campaña cerrada.
 *
 * La regla que ordena esta pantalla: **cero y "no se midió" son cosas
 * distintas y no pueden verse igual.** Cero transferencias es un
 * resultado; no haberlas medido es una laguna nuestra. Mostrar un cero
 * donde falta instrumentación convierte un problema propio en un dato
 * sobre las organizaciones, que es exactamente al revés.
 *
 * Por eso cada métrica sólo aparece si existe, y lo que falta se dice en
 * un bloque aparte con el mismo tratamiento de "sin señal" que el mapa.
 */

function Dato({
  etiqueta,
  valor,
  contexto,
}: {
  etiqueta: string;
  valor: string;
  contexto: string;
}) {
  return (
    <div className="metric metric-md">
      <p className="metric-label">{etiqueta}</p>
      <p className="metric-value">{valor}</p>
      <p className="metric-sub">{contexto}</p>
    </div>
  );
}

export function CampaignResultsPanel({ tenant }: { tenant: Tenant }) {
  const { results, organizations, hotspots, closedAt, year } = tenant;

  const hectareas = hotspots.reduce((s, h) => s + (h.hectares ?? 0), 0);

  /** Lo que sabemos porque lo relevamos, no porque lo hayamos medido. */
  const relevado = [
    {
      etiqueta: "Organizaciones",
      valor: num(organizations.length),
      contexto: "relevadas y con su titular chequeado a mano",
    },
    ...(hectareas > 0
      ? [
          {
            etiqueta: "Superficie afectada",
            valor: num(hectareas),
            contexto: `hectáreas en ${hotspots.length} focos relevados`,
          },
        ]
      : []),
  ];

  /** Lo que sabemos porque lo medimos. Puede estar vacío, y se dice. */
  const medido = [
    results?.visits !== undefined && {
      etiqueta: "Visitas",
      valor: num(results.visits),
      contexto: "durante la campaña",
    },
    results?.aliasCopies !== undefined && {
      etiqueta: "Alias copiados",
      valor: num(results.aliasCopies),
      contexto: "gente que se llevó los datos para transferir",
    },
    results?.transferClicks !== undefined && {
      etiqueta: "Transferencias iniciadas",
      valor: num(results.transferClicks),
      contexto:
        "aperturas de la app de pago. No sabemos cuáles terminaron en una donación: la plata nunca pasa por acá",
    },
    results?.shares !== undefined && {
      etiqueta: "Compartidas",
      valor: num(results.shares),
      contexto: "veces que alguien difundió una organización",
    },
  ].filter(Boolean) as { etiqueta: string; valor: string; contexto: string }[];

  return (
    <section className="section-subtle">
      <div className="container section-tight">
        <div className="section-head">
          <p className="eyebrow">Resultados</p>
          <h2 className="heading-2">Qué dejó la campaña {year}</h2>
          {closedAt && (
            <p className="lead">
              Cerrada el{" "}
              <time dateTime={closedAt}>{fullDate(closedAt).split(",")[0]}</time>
              . Las organizaciones siguen existiendo; lo que terminó es este
              relevamiento.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {relevado.map((d) => (
            <Dato key={d.etiqueta} {...d} />
          ))}
          {medido.map((d) => (
            <Dato key={d.etiqueta} {...d} />
          ))}
        </div>

        {results?.notMeasured && (
          /* Mismo tratamiento que el "sin señal" del mapa: borde punteado,
             dicho con todas las letras, sin un cero que se lea como dato. */
          <div
            className="mt-8 flex flex-col gap-2 rounded-[var(--r-card)] p-6"
            style={{
              border: "1px dashed var(--border-strong)",
              background: "var(--surface-card)",
            }}
          >
            <p className="eyebrow">Sin medición</p>
            <p style={{ color: "var(--text-body)" }}>{results.notMeasured}</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Preferimos decirlo antes que publicar un número que no
              representa nada. Las próximas campañas se miden desde el primer
              día.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
