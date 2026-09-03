"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertTriangle } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { ORG_TYPE_LABEL, type OrgType } from "@/lib/types";

/**
 * El panel de moderación regional.
 *
 * Un moderador ve y opera únicamente sus provincias — no porque esta
 * pantalla filtre, sino porque las políticas de la base lo hacen: si esta
 * interfaz pidiera otra región, recibiría cero filas. La pantalla es una
 * ventana, la autoridad vive en Postgres y está probada en rls-v2.sql.
 *
 * Las dos decisiones fuertes pasan por acá: confirmar la huella pública
 * (que junto a un aval publica en nivel 1) y la verificación completa
 * (nivel 2, con checklist de titularidad). Rechazar exige motivo — el
 * owner lo lee y puede corregir.
 */

interface Fila {
  id: string;
  slug: string;
  name: string;
  type: OrgType;
  description: string;
  status: string;
  verification_level: number;
  province: string | null;
  locality: string | null;
  holder_name: string | null;
  contact_email: string | null;
  org_channels: { rail: string; identifier: string }[];
  verification_checks: { check_type: string; result: string; notes: string | null }[];
}

interface Reporte {
  id: string;
  reason: string;
  detail: string;
  status: string;
  created_at: string;
  org: { name: string; id: string } | null;
}

const CHECKS: { tipo: string; label: string; ayuda: string }[] = [
  { tipo: "titularidad", label: "Titularidad", ayuda: "El alias resuelve al nombre de la entidad o de su responsable declarada." },
  { tipo: "registro", label: "Registro", ayuda: "CUIT, personería o registro provincial de brigadas/bomberos." },
  { tipo: "huella_publica", label: "Huella pública", ayuda: "Redes con historia real, menciones en medios. Con un aval, publica en nivel 1." },
];

export function ModeratorPanel({ db }: { db: SupabaseClient }) {
  const [provincias, setProvincias] = useState<string[] | null>(null);
  const [cola, setCola] = useState<Fila[]>([]);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [abierta, setAbierta] = useState<Fila | null>(null);

  const cargar = useCallback(async () => {
    const { data: user } = await db.auth.getUser();
    if (!user.user) return;
    const { data: regiones } = await db
      .from("moderator_regions")
      .select("province")
      .eq("user_id", user.user.id);
    const provs = (regiones ?? []).map((r) => r.province);
    setProvincias(provs);
    if (!provs.length) return;

    const [pendientes, reps] = await Promise.all([
      db.from("organizations")
        .select("id, slug, name, type, description, status, verification_level, province, locality, holder_name, contact_email, org_channels(rail, identifier), verification_checks(check_type, result, notes)")
        .in("province", provs)
        .or("verification_level.eq.0,status.eq.en_revision"),
      db.from("reports")
        .select("id, reason, detail, status, created_at, org:organizations(name, id)")
        .eq("status", "pendiente"),
    ]);
    setCola((pendientes.data ?? []) as unknown as Fila[]);
    setReportes((reps.data ?? []) as unknown as Reporte[]);
  }, [db]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!provincias?.length) return null;

  if (abierta)
    return (
      <Revision
        db={db}
        fila={abierta}
        onBack={() => {
          setAbierta(null);
          void cargar();
        }}
      />
    );

  return (
    <div className="flex flex-col gap-4" data-tour="moderacion">
      <div>
        <p className="eyebrow">Moderación · {provincias.join(", ")}</p>
        <h2 className="heading-3 mt-2">Cola de verificación</h2>
      </div>

      {cola.length === 0 ? (
        <div className="card card-subtle">
          <p style={{ color: "var(--text-muted)" }}>
            Nada pendiente en tu región. Las entidades nuevas van a aparecer acá.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {cola.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => setAbierta(f)}
                className="card card-hover flex w-full items-center justify-between gap-4 text-left"
                style={{ padding: "14px 18px" }}
              >
                <span className="min-w-0">
                  <span className="block truncate" style={{ color: "var(--text-strong)" }}>
                    {f.name}
                  </span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {ORG_TYPE_LABEL[f.type]} · {f.locality ?? f.province} · nivel {f.verification_level}
                  </span>
                </span>
                <span className="badge badge-neutral shrink-0">{f.status.replace("_", " ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {reportes.length > 0 && (
        <>
          <div className="flex items-baseline gap-2">
            <h3 className="heading-3">Reportes</h3>
            <span className="badge badge-warning">
              <AlertTriangle size={12} strokeWidth={2} aria-hidden />
              {reportes.length} sin resolver
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {reportes.map((r) => (
              <li key={r.id} className="card flex flex-col gap-2">
                <p className="eyebrow" style={{ color: "var(--text-faint)" }}>
                  {r.reason.replace("_", " ")} · {relativeTime(r.created_at)}
                </p>
                <p style={{ color: "var(--text-strong)" }}>{r.org?.name}</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{r.detail}</p>
                <div className="flex gap-2">
                  <button className="btn btn-secondary btn-sm"
                          onClick={async () => {
                            await db.from("reports").update({ status: "validado" }).eq("id", r.id);
                            await cargar();
                          }}>
                    Validar (amerita revisión)
                  </button>
                  <button className="btn btn-ghost btn-sm"
                          onClick={async () => {
                            await db.from("reports").update({ status: "descartado" }).eq("id", r.id);
                            await cargar();
                          }}>
                    Descartar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Revision({
  db,
  fila,
  onBack,
}: {
  db: SupabaseClient;
  fila: Fila;
  onBack: () => void;
}) {
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function marcarCheck(tipo: string, result: "ok" | "observado") {
    const { error } = await db.from("verification_checks").insert({
      org_id: fila.id,
      check_type: tipo,
      result,
      notes: notas[tipo] || null,
    });
    if (error) setError(error.message);
    else onBack();
  }

  async function subirANivel2() {
    const { data, error } = await db
      .from("organizations")
      .update({ verification_level: 2, status: "verificada", moderation_note: null })
      .eq("id", fila.id)
      .select("id");
    if (error || !data?.length) setError(error?.message ?? "No se pudo actualizar.");
    else onBack();
  }

  async function pedirMasInfo() {
    if (!motivo.trim()) return setError("El pedido de información exige un motivo.");
    const { error } = await db
      .from("organizations")
      .update({ status: "borrador", moderation_note: motivo })
      .eq("id", fila.id);
    if (error) setError(error.message);
    else onBack();
  }

  const hecho = (tipo: string) =>
    fila.verification_checks.find((c) => c.check_type === tipo);

  const campo = {
    background: "var(--surface-card)",
    border: "1px solid var(--border-hairline)",
    borderRadius: "var(--r-field)",
    color: "var(--text-strong)",
    padding: "10px 14px",
    width: "100%",
  } as const;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Cola</button>
        <h2 className="heading-2 mt-2">{fila.name}</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {ORG_TYPE_LABEL[fila.type]} · {fila.locality ?? ""} {fila.province} · nivel{" "}
          {fila.verification_level}
        </p>
      </div>

      <div className="card card-subtle flex flex-col gap-2">
        <p style={{ color: "var(--text-body)" }}>{fila.description}</p>
        {fila.org_channels.map((c) => (
          <p key={c.identifier} className="text-sm" style={{ color: "var(--text-muted)" }}>
            Alias declarado: <span className="alias">{c.identifier}</span>
            {fila.holder_name && ` · titular: ${fila.holder_name}`}
          </p>
        ))}
        {fila.contact_email && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Contacto: {fila.contact_email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="eyebrow">Checklist</p>
        {CHECKS.map((c) => {
          const previo = hecho(c.tipo);
          return (
            <div key={c.tipo} className="card flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <p style={{ color: "var(--text-strong)" }}>{c.label}</p>
                {previo && (
                  <span className={`badge ${previo.result === "ok" ? "badge-accent" : "badge-warning"}`}>
                    {previo.result}
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{c.ayuda}</p>
              {!previo && (
                <>
                  <input
                    value={notas[c.tipo] ?? ""}
                    onChange={(e) => setNotas({ ...notas, [c.tipo]: e.target.value })}
                    placeholder="Qué verificaste (queda en el registro)"
                    style={campo}
                  />
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => marcarCheck(c.tipo, "ok")}>
                      Confirmar
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => marcarCheck(c.tipo, "observado")}>
                      Observar
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="card flex flex-col gap-3">
        <p className="eyebrow">Decisión</p>
        <button className="btn btn-primary btn-md self-start" onClick={subirANivel2}>
          Verificación completa (nivel 2)
        </button>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Publica con badge verde. Exige titularidad confirmada más registro o
          avales — lo que acabás de chequear arriba queda como constancia.
        </p>
        <textarea
          rows={2}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo (obligatorio para pedir más información)"
          style={campo}
        />
        <button className="btn btn-secondary btn-sm self-start" onClick={pedirMasInfo}>
          Pedir más información
        </button>
      </div>
    </div>
  );
}
