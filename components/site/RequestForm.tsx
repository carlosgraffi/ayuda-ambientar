"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/admin/browser";
import { brand } from "@/lib/brand";

/**
 * Pedir una instancia.
 *
 * Escribe directo en la base con la clave anónima: las políticas permiten
 * insertar sin autenticar y NO permiten leer. Cualquiera puede dejar una
 * solicitud; nadie puede ver las de los demás, que traen nombre y correo
 * de personas.
 *
 * La aprobación es siempre manual y el formulario lo dice. El autoservicio
 * abierto sería superficie de fraude, y acá la marca ES la confianza: si
 * alguien abre una instancia con este diseño y publica alias inventados,
 * el daño no es sólo suyo.
 */

const DESASTRES = [
  { id: "fuego", label: "Incendios" },
  { id: "agua", label: "Inundaciones" },
  { id: "viento", label: "Tormentas o vientos" },
];

const campo = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-hairline)",
  borderRadius: "var(--r-field)",
  color: "var(--text-strong)",
  minHeight: "var(--touch-min)",
  padding: "10px 14px",
  width: "100%",
} as const;

export function RequestForm() {
  const [db, setDb] = useState<SupabaseClient | null>(null);
  const [listo, setListo] = useState(false);
  const [estado, setEstado] = useState<"inicial" | "enviando" | "enviado">("inicial");
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    contact_name: "",
    contact_email: "",
    country_code: "",
    disaster_type: "fuego",
    description: "",
  });

  useEffect(() => {
    getBrowserClient().then((c) => {
      setDb(c);
      setListo(true);
    });
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!db) return;
    setEstado("enviando");
    setError(null);
    const { error } = await db.from("instance_requests").insert(f);
    if (error) {
      setError(error.message);
      setEstado("inicial");
    } else {
      setEstado("enviado");
    }
  }

  if (estado === "enviado") {
    return (
      <div className="card flex flex-col gap-3">
        <p className="eyebrow">Recibido</p>
        <h2 className="heading-2">Gracias. Te vamos a escribir.</h2>
        <p style={{ color: "var(--text-muted)" }}>
          Cada solicitud la miramos a mano, así que puede tardar unos días.
          Si es urgente porque la emergencia está ocurriendo, escribinos
          directamente a{" "}
          <a href={`mailto:${brand.contactEmail}`}>{brand.contactEmail}</a> y
          lo vemos antes.
        </p>
      </div>
    );
  }

  /* Sin base configurada el formulario no puede prometer nada: se ofrece
     el correo, que sí funciona siempre. */
  if (listo && !db) {
    return (
      <div className="card flex flex-col gap-3">
        <p className="eyebrow">Escribinos</p>
        <p style={{ color: "var(--text-muted)" }}>
          El formulario no está disponible en este despliegue. Contanos por
          correo a{" "}
          <a href={`mailto:${brand.contactEmail}?subject=Solicitar una instancia`}>
            {brand.contactEmail}
          </a>
          : dónde es, qué pasó y quién está organizando la respuesta.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="card flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="metric-label">Tu nombre</span>
          <input
            required
            value={f.contact_name}
            onChange={(e) => setF({ ...f, contact_name: e.target.value })}
            style={campo}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="metric-label">Tu correo</span>
          <input
            required
            type="email"
            value={f.contact_email}
            onChange={(e) => setF({ ...f, contact_email: e.target.value })}
            style={campo}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="metric-label">País</span>
          <input
            required
            maxLength={2}
            placeholder="AR, CO, CL…"
            value={f.country_code}
            onChange={(e) =>
              setF({ ...f, country_code: e.target.value.toUpperCase() })
            }
            style={campo}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="metric-label">Qué pasó</span>
          <select
            value={f.disaster_type}
            onChange={(e) => setF({ ...f, disaster_type: e.target.value })}
            style={campo}
          >
            {DESASTRES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="metric-label">Contanos</span>
        <textarea
          required
          rows={4}
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          placeholder="Dónde es, qué está pasando, quién está organizando la respuesta y con qué organizaciones ya tenés contacto."
          style={{ ...campo, minHeight: 0 }}
        />
      </label>

      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-md self-start"
        disabled={estado === "enviando" || !db}
      >
        {estado === "enviando" ? "Enviando…" : "Enviar la solicitud"}
      </button>

      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Las miramos una por una antes de abrir nada. No es burocracia: una
        instancia publica alias de transferencia con este diseño detrás, y
        si alguien la usa para estafar, el daño no es sólo suyo.
      </p>
    </form>
  );
}
