import { ArrowRight } from "lucide-react";
import { fullDate } from "@/lib/format";
import { brand } from "@/lib/brand";
import type { Tenant } from "@/lib/tenants";
import { instancePath } from "@/lib/urls";

/**
 * Aviso de campaña cerrada.
 *
 * Va arriba de todo y sin colapsar. El riesgo concreto que evita: alguien
 * llega desde un enlace viejo de WhatsApp, ve una lista de alias y
 * transfiere a una colecta que terminó hace meses. Por eso además de este
 * cartel la tarjeta deja de ofrecer las acciones de transferencia.
 *
 * No es una advertencia amarilla: el amarillo significa peligro y esto es
 * una aclaración de estado. Va en superficie neutra.
 */
export function ClosedNotice({
  tenant,
  vigente,
}: {
  tenant: Tenant;
  vigente?: Tenant;
}) {
  return (
    <div
      className="card flex flex-col gap-3"
      style={{ borderColor: "var(--border-strong)" }}
    >
      <p className="eyebrow">Campaña cerrada</p>
      <p style={{ color: "var(--text-body)" }}>
        Este relevamiento de {tenant.year} terminó
        {tenant.closedAt && (
          <>
            {" "}
            el{" "}
            <time dateTime={tenant.closedAt}>
              {fullDate(tenant.closedAt).split(",")[0]}
            </time>
          </>
        )}
        . Queda publicado como registro de lo que pasó, pero{" "}
        <strong>ya no verificamos que estas cuentas sigan activas</strong>, así
        que no conviene transferir desde acá.
      </p>
      {/* Nunca un callejón sin salida: si no hay edición vigente de este
          territorio, al menos la portada dice qué hay abierto en otros. */}
      {vigente ? (
        <a
          href={instancePath(vigente)}
          className="btn btn-primary btn-md self-start"
        >
          Ir a la campaña {vigente.year}
          <ArrowRight size={17} strokeWidth={1.75} aria-hidden />
        </a>
      ) : (
        <a href="/" className="btn btn-secondary btn-md self-start">
          Ver qué campañas están abiertas en {brand.name}
          <ArrowRight size={17} strokeWidth={1.75} aria-hidden />
        </a>
      )}
    </div>
  );
}
