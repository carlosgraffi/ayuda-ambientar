import { Flame } from "lucide-react";
import { brand } from "@/lib/brand";
import { fullDate, relativeTime } from "@/lib/format";
import { ThemeToggle } from "./ThemeToggle";

/**
 * En producción esta barra es `bg-orange-600/85` a todo lo ancho, con
 * texto blanco. El problema no es el gusto: cuando todo el fondo es fuego,
 * nada naranja de la página puede destacarse — y abajo hay botones
 * naranjas, títulos naranjas y números naranjas. Acá pasa a vidrio claro
 * y la llama queda reducida a un ícono de 20px, que es donde el color
 * todavía significa algo.
 *
 * La fecha es relativa y derivada del contenido, no escrita a mano.
 */
export function TopBar({ lastReviewed }: { lastReviewed: string }) {
  return (
    <header className="glass sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between gap-4">
        <a href="#contenido" className="brand brand-md">
          <Flame
            size={20}
            strokeWidth={1.75}
            aria-hidden
            style={{ color: "var(--accent-600)", marginRight: 8 }}
          />
          {brand.nameLight}
          <b>{brand.nameBold}</b>
        </a>

        <div className="flex items-center gap-3">
          <p
            className="hidden text-right text-xs sm:block"
            style={{ color: "var(--text-muted)" }}
          >
            Revisado{" "}
            <time dateTime={lastReviewed} title={fullDate(lastReviewed)}>
              {relativeTime(lastReviewed)}
            </time>
          </p>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
