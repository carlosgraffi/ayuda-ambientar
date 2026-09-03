"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { getBrowserClient } from "@/lib/admin/browser";

/**
 * Reportar una entidad. Cualquiera puede; lo revisa el moderador de la
 * región. Es la contracara pública de la verificación distribuida: si la
 * curaduría se descentraliza, la señal de alarma también.
 *
 * Escribe con la clave anónima: la política permite insertar y no leer,
 * igual que las solicitudes de instancia.
 */
const MOTIVOS = [
  { id: "fraude", label: "Sospecho un fraude" },
  { id: "datos_incorrectos", label: "Los datos no coinciden" },
  { id: "inactiva", label: "Ya no está activa" },
  { id: "otro", label: "Otro motivo" },
];

export function ReportButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("datos_incorrectos");
  const [detalle, setDetalle] = useState("");
  const [contacto, setContacto] = useState("");
  const [estado, setEstado] = useState<"inicial" | "enviando" | "enviado" | "error">("inicial");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const db = await getBrowserClient();
    if (!db) return setEstado("error");
    const { error } = await db.from("reports").insert({
      org_id: orgId,
      reason: motivo,
      detail: detalle,
      reporter_contact: contacto || null,
    });
    setEstado(error ? "error" : "enviado");
  }

  if (estado === "enviado") {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Gracias. El reporte llegó a la persona que modera esta región.
      </p>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setAbierto(true)}
      >
        <Flag size={14} strokeWidth={1.75} aria-hidden />
        Reportar esta entidad
      </button>
    );
  }

  const campo = {
    background: "var(--surface-card)",
    border: "1px solid var(--border-hairline)",
    borderRadius: "var(--r-field)",
    color: "var(--text-strong)",
    padding: "10px 14px",
    width: "100%",
  } as const;

  return (
    <form onSubmit={enviar} className="card card-subtle flex flex-col gap-3">
      <p className="eyebrow">Reportar a {orgName}</p>
      <select value={motivo} onChange={(e) => setMotivo(e.target.value)} style={campo}>
        {MOTIVOS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
      <textarea
        required
        rows={3}
        value={detalle}
        onChange={(e) => setDetalle(e.target.value)}
        placeholder="Contá qué viste. Cuanto más concreto, más rápido se puede actuar."
        style={campo}
      />
      <input
        value={contacto}
        onChange={(e) => setContacto(e.target.value)}
        placeholder="Tu contacto (opcional, por si hace falta preguntarte algo)"
        style={campo}
      />
      {estado === "error" && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          No se pudo enviar. Probá de nuevo en un rato.
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={estado === "enviando"}>
          {estado === "enviando" ? "Enviando…" : "Enviar el reporte"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
