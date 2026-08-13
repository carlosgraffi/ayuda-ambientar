import { ArrowUpRight } from "lucide-react";
import type { Campaign } from "@/lib/types";

/**
 * Antes: seis banners `border-l-4` en lima, naranja, rosa, azul, azul e
 * índigo, cada uno con su botón de su propio color, sin que nada explicara
 * por qué Don.ar era lima y AcercAR azul. Seis llamados a la acción del
 * mismo peso compitiendo entre sí, y el sistema descarta de plano el
 * patrón de caja tintada con borde izquierdo de color.
 *
 * Un solo tratamiento: superficie sólida, la organización como rótulo
 * mono, y un botón en tinta.
 */
export function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
      {campaigns.map((c) => (
        <li key={c.url} className="card card-hover flex h-full flex-col gap-3">
          <div>
            <p className="eyebrow" style={{ color: "var(--text-faint)" }}>
              {c.organization}
            </p>
            <h3 className="heading-3 mt-1.5">{c.title}</h3>
          </div>
          <p className="grow" style={{ color: "var(--text-muted)" }}>
            {c.description}
          </p>
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn-md self-start ${
              c.tone === "urgente" ? "btn-primary" : "btn-secondary"
            }`}
          >
            {c.cta}
            <ArrowUpRight size={17} strokeWidth={1.75} aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}
