"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { relativeTime } from "@/lib/format";

/**
 * Solicitudes de instancia.
 *
 * Sólo la ve quien administra la plataforma: cada fila trae el nombre y el
 * correo de una persona. Las políticas ya lo garantizan —un miembro común
 * consulta y recibe cero filas— así que este componente no tiene que
 * comprobar nada: si no hay permiso, no hay datos.
 *
 * Abrir la instancia no se hace desde acá a propósito. Es un acto raro y
 * de consecuencias grandes: publica alias de transferencia con este diseño
 * detrás. Se hace deliberadamente, con el seed, después de hablar con
 * quien la pidió.
 */

interface Solicitud {
  id: string;
  contact_name: string;
  contact_email: string;
  country_code: string;
  disaster_type: string;
  description: string;
  status: string;
  created_at: string;
}

const ESTADOS = ["pendiente", "en conversación", "abierta", "rechazada"];

export function RequestsInbox({ db }: { db: SupabaseClient }) {
  const [filas, setFilas] = useState<Solicitud[] | null>(null);

  async function cargar() {
    const { data } = await db
      .from("instance_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setFilas((data ?? []) as Solicitud[]);
  }

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function marcar(id: string, status: string) {
    await db.from("instance_requests").update({ status }).eq("id", id);
    void cargar();
  }

  if (!filas?.length) return null;

  const pendientes = filas.filter((f) => f.status === "pendiente").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <h2 className="heading-3">Solicitudes de instancia</h2>
        {pendientes > 0 && (
          <span className="badge badge-accent">{pendientes} sin responder</span>
        )}
      </div>

      <ul className="flex flex-col gap-3">
        {filas.map((s) => (
          <li key={s.id} className="card flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow" style={{ color: "var(--text-faint)" }}>
                  {s.country_code} · {s.disaster_type} ·{" "}
                  {relativeTime(s.created_at)}
                </p>
                <p className="mt-1.5" style={{ color: "var(--text-strong)" }}>
                  {s.contact_name}
                </p>
                <a href={`mailto:${s.contact_email}`} className="text-sm">
                  {s.contact_email}
                </a>
              </div>
              <select
                value={s.status}
                onChange={(e) => marcar(s.id, e.target.value)}
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-hairline)",
                  borderRadius: "var(--r-field)",
                  color: "var(--text-strong)",
                  padding: "8px 12px",
                }}
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {s.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
