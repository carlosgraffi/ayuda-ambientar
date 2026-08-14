"use client";

import { useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { relativeTime } from "@/lib/format";

/**
 * Edición de una organización, con el flujo de verificación adentro.
 *
 * La regla que ordena esta pantalla: **no se puede publicar sin registrar
 * una verificación.** No es burocracia — si el sitio dice "verificada" y
 * hay un fraude, la responsabilidad es de quien la publicó, y tiene que
 * constar quién la chequeó, cuándo y cómo. Por eso pasar a `verificada`
 * abre el formulario de verificación en vez de guardar directo.
 *
 * Y toda verificación vence. Una de hace ocho meses no es una
 * verificación: la organización pudo haber cambiado de cuenta, o la
 * persona que la manejaba ya no está.
 */

export type EstadoOrg =
  | "borrador"
  | "en_revision"
  | "verificada"
  | "pausada"
  | "archivada";

export interface OrgFila {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string;
  holder_name: string | null;
  holder_status: "declarado" | "no_declarado" | "en_verificacion";
  status: EstadoOrg;
  urgent: boolean;
  org_verifications?: { verified_at: string; expires_at: string | null }[];
}

const TIPOS = ["bomberos", "brigada", "viandas", "familias", "comunidad"];

const ESTADOS: { id: EstadoOrg; label: string; nota: string }[] = [
  { id: "borrador", label: "Borrador", nota: "No se publica." },
  { id: "en_revision", label: "En revisión", nota: "No se publica todavía." },
  { id: "verificada", label: "Verificada", nota: "Se publica en el sitio." },
  { id: "pausada", label: "Pausada", nota: "Se publica, sin destacar." },
  { id: "archivada", label: "Archivada", nota: "Se retira, no se borra." },
];

const METODOS = [
  "Llamada telefónica",
  "Contacto presencial",
  "Referencia de otra organización",
  "Documentación recibida",
];

/** La verificación vigente, si hay alguna y no venció. */
export function verificacionVigente(org: OrgFila) {
  const ahora = Date.now();
  return (org.org_verifications ?? [])
    .filter((v) => !v.expires_at || new Date(v.expires_at).getTime() > ahora)
    .sort(
      (a, b) =>
        new Date(b.verified_at).getTime() - new Date(a.verified_at).getTime(),
    )[0];
}

export function OrgEditor({
  db,
  org,
  onSaved,
  onClose,
}: {
  db: SupabaseClient;
  org: OrgFila;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(org);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vigente = verificacionVigente(org);
  const pasaAPublicada = form.status === "verificada" && !vigente;

  const [metodo, setMetodo] = useState(METODOS[0]);
  const [notas, setNotas] = useState("");
  const [meses, setMeses] = useState(6);

  function set<K extends keyof OrgFila>(k: K, v: OrgFila[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    // El check de la base exige nombre si el titular está declarado; se
    // avisa acá antes de que devuelva un error de Postgres.
    if (form.holder_status === "declarado" && !form.holder_name?.trim()) {
      setError("Si el titular está declarado, hace falta el nombre.");
      setGuardando(false);
      return;
    }

    /**
     * `.select()` a propósito: si las políticas filtran la fila, PostgREST
     * responde 200 con cero filas y sin error. Sin esto el panel diría
     * "guardado" sobre algo que no se guardó, que es el modo de fallo más
     * peligroso posible en una pantalla que edita alias de transferencia.
     */
    const { data: guardado, error: e1 } = await db
      .from("organizations")
      .update({
        name: form.name,
        type: form.type,
        description: form.description,
        holder_name: form.holder_name || null,
        holder_status: form.holder_status,
        status: form.status,
        urgent: form.urgent,
      })
      .eq("id", org.id)
      .select("id");

    if (e1 || !guardado?.length) {
      setError(
        e1?.message ??
          "No se guardó: tu cuenta no tiene permiso para editar esta organización.",
      );
      setGuardando(false);
      return;
    }

    if (pasaAPublicada) {
      const vence = new Date();
      vence.setMonth(vence.getMonth() + meses);
      const { error: e2 } = await db.from("org_verifications").insert({
        org_id: org.id,
        method: metodo,
        notes: notas || null,
        expires_at: vence.toISOString(),
      });
      if (e2) {
        setError(e2.message);
        setGuardando(false);
        return;
      }
    }

    setGuardando(false);
    onSaved();
  }

  const campo = {
    background: "var(--surface-card)",
    border: "1px solid var(--border-hairline)",
    borderRadius: "var(--r-field)",
    color: "var(--text-strong)",
    minHeight: "var(--touch-min)",
    padding: "10px 14px",
    width: "100%",
  } as const;

  return (
    <form onSubmit={guardar} className="card flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{org.slug}</p>
          <h2 className="heading-3 mt-1.5">{org.name}</h2>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <label className="flex flex-col gap-2">
        <span className="metric-label">Nombre</span>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          style={campo}
          required
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="metric-label">Qué hace</span>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            style={campo}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="metric-label">Titular de la cuenta</span>
          <select
            value={form.holder_status}
            onChange={(e) => set("holder_status", e.target.value as never)}
            style={campo}
          >
            <option value="declarado">Declarado</option>
            <option value="no_declarado">No declarado</option>
            <option value="en_verificacion">En verificación</option>
          </select>
        </label>
      </div>

      {form.holder_status === "declarado" && (
        <label className="flex flex-col gap-2">
          <span className="metric-label">Nombre del titular</span>
          <input
            value={form.holder_name ?? ""}
            onChange={(e) => set("holder_name", e.target.value)}
            style={campo}
          />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Tal como figura en la cuenta. Es lo que la gente compara antes de
            transferir.
          </span>
        </label>
      )}

      <label className="flex flex-col gap-2">
        <span className="metric-label">Descripción</span>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          style={{ ...campo, minHeight: 0 }}
          required
        />
      </label>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={form.urgent}
          onChange={(e) => set("urgent", e.target.checked)}
        />
        <span>Destacar como urgente</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="metric-label">Estado</span>
        <select
          value={form.status}
          onChange={(e) => set("status", e.target.value as EstadoOrg)}
          style={campo}
        >
          {ESTADOS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label} — {e.nota}
            </option>
          ))}
        </select>
      </label>

      {vigente && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          <ShieldCheck
            size={14}
            strokeWidth={1.75}
            aria-hidden
            style={{ display: "inline", verticalAlign: "-2px" }}
          />{" "}
          Verificada {relativeTime(vigente.verified_at)}
          {vigente.expires_at && ` · vence ${relativeTime(vigente.expires_at)}`}
        </p>
      )}

      {/* Publicar exige dejar constancia. No se puede saltear. */}
      {pasaAPublicada && (
        <div
          className="flex flex-col gap-3 rounded-[var(--r-card)] p-5"
          style={{
            border: "1px dashed var(--border-strong)",
            background: "var(--surface-card-subtle)",
          }}
        >
          <p className="eyebrow">Antes de publicarla</p>
          <p className="text-sm" style={{ color: "var(--text-body)" }}>
            Publicar esta organización es afirmar que su cuenta es de quien
            dice ser. Contá cómo lo chequeaste: si mañana hay una denuncia,
            esto es lo que queda.
          </p>

          <label className="flex flex-col gap-2">
            <span className="metric-label">Cómo se verificó</span>
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              style={campo}
            >
              {METODOS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="metric-label">Notas internas</span>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Con quién hablaste, qué te mostró."
              style={{ ...campo, minHeight: 0 }}
            />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              No se publican. Evitá copiar acá documentos o datos personales.
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="metric-label">Revisar de nuevo en</span>
            <select
              value={meses}
              onChange={(e) => setMeses(Number(e.target.value))}
              style={campo}
            >
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
          </label>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="btn btn-primary btn-md"
          disabled={guardando}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {form.status !== "archivada" && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => set("status", "archivada")}
          >
            <Trash2 size={15} strokeWidth={1.75} aria-hidden />
            Archivar
          </button>
        )}
      </div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Archivar la retira del sitio pero no la borra: el registro queda para
        poder reconstruir qué se mostraba y cuándo.
      </p>
    </form>
  );
}
