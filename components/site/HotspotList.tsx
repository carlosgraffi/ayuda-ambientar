import type { Hotspot } from "@/lib/types";
import { HOTSPOT_STATUS_LABEL } from "@/lib/types";
import { num } from "@/lib/format";

/**
 * Antes eran siete cajas `bg-gray-100` idénticas, así que 24.100 hectáreas
 * y 84 hectáreas se veían exactamente igual, y "Estado: Contenido"
 * aparecía siete veces en negrita.
 *
 * Ahora: lista ordenada por superficie, el número grande y tabular, el
 * estado como chip, las extinguidas atenuadas — y el total arriba, que es
 * el número titular de la sección y hoy no está en ningún lado.
 */
export function HotspotList({ hotspots }: { hotspots: Hotspot[] }) {
  const sorted = [...hotspots].sort(
    (a, b) => (b.hectares ?? 0) - (a.hectares ?? 0),
  );
  const total = sorted.reduce((sum, h) => sum + (h.hectares ?? 0), 0);
  const unreported = sorted.filter((h) => h.hectares === null).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="metric metric-xl">
        <p className="metric-label">Superficie afectada</p>
        <p className="metric-value">{num(total)}</p>
        <p className="metric-sub">
          hectáreas en {sorted.length} focos relevados
          {unreported > 0 &&
            `, ${unreported} de ellos sin superficie reportada`}
        </p>
      </div>

      <ul className="flex flex-col">
        {sorted.map((h) => {
          const out = h.status === "extinguido";
          return (
            <li
              key={h.name}
              className="flex items-baseline justify-between gap-4 py-4"
              style={{
                borderTop: "1px solid var(--border-hairline)",
                opacity: out ? 0.55 : 1,
              }}
            >
              <div className="min-w-0">
                <p style={{ color: "var(--text-strong)" }}>{h.name}</p>
                <span
                  className={`badge mt-2 ${
                    out ? "badge-neutral" : "badge-accent"
                  }`}
                >
                  {HOTSPOT_STATUS_LABEL[h.status]}
                </span>
              </div>
              <p className="num shrink-0 text-right text-2xl font-medium tabular-nums" style={{ color: "var(--text-strong)" }}>
                {h.hectares === null ? (
                  <span className="badge badge-sin-senal">Sin reporte</span>
                ) : (
                  <>
                    {num(h.hectares)}
                    <span
                      className="ml-1 text-sm font-normal"
                      style={{ color: "var(--text-muted)", letterSpacing: 0 }}
                    >
                      ha
                    </span>
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
