"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { relativeTime } from "@/lib/format";
import { URGENCY_LABEL, VERIFICATION_LABEL } from "@/lib/types";

/**
 * El panel del owner: su perfil, sus necesidades y su verificación.
 *
 * Las necesidades se actualizan en tres toques (ítem → urgencia → listo)
 * porque quien las actualiza está en el medio de una emergencia, desde el
 * celular. Y la caja de verificación dice QUÉ FALTA en vez de un estado
 * opaco: el owner tiene que poder responder "¿por qué no aparezco
 * todavía?" sin escribirle a nadie.
 */

interface Entidad {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: string;
  verification_level: number;
  province: string | null;
  moderation_note: string | null;
}

interface Necesidad {
  id: string;
  urgency: "urgente" | "se_necesita" | "cubierto";
  quantity_note: string | null;
  delivery_note: string | null;
  updated_at: string;
  supply: { id: string; name: string } | null;
}

interface Aval {
  id: string;
  status: string;
  endorser: { name: string } | null;
}

interface Check {
  check_type: string;
  result: string;
  notes: string | null;
}

const CHECK_LABEL: Record<string, string> = {
  titularidad: "Titularidad de la cuenta",
  legal: "CUIT / personería",
  registro: "Registro oficial",
  huella_publica: "Huella pública",
};

export function MyEntityPanel({ db }: { db: SupabaseClient }) {
  const [entidades, setEntidades] = useState<Entidad[] | null>(null);
  const [abierta, setAbierta] = useState<Entidad | null>(null);

  useEffect(() => {
    void db.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      void db
        .from("organizations")
        .select("id, slug, name, description, status, verification_level, province, moderation_note")
        .eq("owner_user_id", data.user.id)
        .then(({ data: filas }) => setEntidades((filas ?? []) as Entidad[]));
    });
  }, [db]);

  if (!entidades?.length) return null;

  if (abierta)
    return <EntityEditor db={db} entidad={abierta} onBack={() => setAbierta(null)} />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="eyebrow">Tu organización</p>
        <h2 className="heading-3 mt-2">Mi entidad</h2>
      </div>
      <ul className="flex flex-col gap-2">
        {entidades.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => setAbierta(e)}
              className="card card-hover flex w-full items-center justify-between gap-4 text-left"
              style={{ padding: "14px 18px" }}
            >
              <span className="min-w-0">
                <span className="block truncate" style={{ color: "var(--text-strong)" }}>
                  {e.name}
                </span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {VERIFICATION_LABEL[e.verification_level as 0 | 1 | 2]}
                </span>
              </span>
              <span
                className={`badge shrink-0 ${
                  e.verification_level >= 1 ? "badge-accent" : "badge-neutral"
                }`}
              >
                {e.verification_level >= 1 ? "Publicada" : "Sin publicar"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EntityEditor({
  db,
  entidad,
  onBack,
}: {
  db: SupabaseClient;
  entidad: Entidad;
  onBack: () => void;
}) {
  const [f, setF] = useState(entidad);
  const [necesidades, setNecesidades] = useState<Necesidad[]>([]);
  const [catalogo, setCatalogo] = useState<{ id: string; name: string; category: string }[]>([]);
  const [avales, setAvales] = useState<Aval[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [msj, setMsj] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [n, c, a, ch] = await Promise.all([
      db.from("org_needs")
        .select("id, urgency, quantity_note, delivery_note, updated_at, supply:supply_catalog(id, name)")
        .eq("org_id", entidad.id),
      db.from("supply_catalog").select("id, name, category").order("position"),
      db.from("endorsements")
        .select("id, status, endorser:organizations!endorsements_endorser_org_id_fkey(name)")
        .eq("endorsed_org_id", entidad.id),
      db.from("verification_checks").select("check_type, result, notes").eq("org_id", entidad.id),
    ]);
    setNecesidades((n.data ?? []) as unknown as Necesidad[]);
    setCatalogo((c.data ?? []) as never[]);
    setAvales((a.data ?? []) as unknown as Aval[]);
    setChecks((ch.data ?? []) as Check[]);
  }, [db, entidad.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Publicación con debounce: guardar avisa al borde, que agrupa y
   * reconstruye cada tanto — no un build por edición.
   */
  async function publicarSilencioso() {
    const { data } = await db.auth.getSession();
    void fetch("/api/publish", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ auto: true }),
    }).catch(() => {});
  }

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await db
      .from("organizations")
      .update({ name: f.name, description: f.description })
      .eq("id", entidad.id)
      .select("id");
    setMsj(error || !data?.length ? "No se pudo guardar." : "Guardado.");
    if (!error) void publicarSilencioso();
  }

  async function ponerUrgencia(id: string, urgency: Necesidad["urgency"]) {
    await db.from("org_needs").update({ urgency }).eq("id", id);
    await cargar();
    void publicarSilencioso();
  }

  async function agregarInsumo(supplyId: string) {
    if (!supplyId) return;
    await db.from("org_needs").insert({
      org_id: entidad.id, kind: "insumos", supply_id: supplyId, urgency: "se_necesita",
    });
    await cargar();
    void publicarSilencioso();
  }

  async function enviarARevision() {
    await db.from("organizations").update({ status: "en_revision" }).eq("id", entidad.id);
    setMsj("Enviada a revisión.");
  }

  const activos = avales.filter((a) => a.status === "activo").length;
  const huella = checks.some((c) => c.check_type === "huella_publica" && c.result === "ok");

  const campo = {
    background: "var(--surface-card)",
    border: "1px solid var(--border-hairline)",
    borderRadius: "var(--r-field)",
    color: "var(--text-strong)",
    padding: "10px 14px",
    width: "100%",
  } as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Mi entidad</button>
        <h2 className="heading-2 mt-2">{entidad.name}</h2>
      </div>

      {/* Qué me falta para verificarme: la pregunta que este panel existe
          para responder. */}
      <div className="card card-subtle flex flex-col gap-2" data-tour="verificacion">
        <p className="eyebrow">Verificación</p>
        <p style={{ color: "var(--text-strong)" }}>
          {VERIFICATION_LABEL[f.verification_level as 0 | 1 | 2]}
        </p>
        {f.verification_level === 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Tenés {activos} de 2 avales activos{huella ? " y huella pública confirmada" : ""}.
            {activos >= 1 && !huella
              ? " Con un aval más te publicás sola — o cuando la moderación confirme tu huella pública."
              : " Con dos avales de organizaciones verificadas tu entidad se publica sola."}
          </p>
        )}
        {f.moderation_note && (
          <p className="text-sm" style={{ color: "var(--warning)" }}>
            Mensaje de moderación: {f.moderation_note}
          </p>
        )}
        {avales.length > 0 && (
          <ul className="text-sm" style={{ color: "var(--text-muted)" }}>
            {avales.map((a) => (
              <li key={a.id}>
                {a.endorser?.name} — {a.status === "activo" ? "avaló" : a.status}
              </li>
            ))}
          </ul>
        )}
        {checks.length > 0 && (
          <ul className="text-sm" style={{ color: "var(--text-muted)" }}>
            {checks.map((c, i) => (
              <li key={i}>
                {CHECK_LABEL[c.check_type] ?? c.check_type}: {c.result}
              </li>
            ))}
          </ul>
        )}
        {f.status === "borrador" && (
          <button className="btn btn-secondary btn-sm self-start" onClick={enviarARevision}>
            Enviar a revisión
          </button>
        )}
      </div>

      <form onSubmit={guardarPerfil} className="card flex flex-col gap-4">
        <p className="eyebrow">Perfil</p>
        <label className="flex flex-col gap-2">
          <span className="metric-label">Nombre</span>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={campo} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="metric-label">Qué hacen</span>
          <textarea rows={3} value={f.description}
                    onChange={(e) => setF({ ...f, description: e.target.value })}
                    style={{ ...campo }} />
        </label>
        {msj && <p className="text-sm" style={{ color: "var(--text-muted)" }}>{msj}</p>}
        <button type="submit" className="btn btn-primary btn-sm self-start">Guardar</button>
      </form>

      {/* Necesidades: tres toques y frescura visible. */}
      <div className="card flex flex-col gap-4" data-tour="necesidades">
        <p className="eyebrow">Qué necesitan ahora</p>
        {necesidades.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Todavía no cargaste necesidades. Lo que marques acá aparece en tu
            perfil y en los filtros del listado.
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {necesidades.map((n) => (
            <li key={n.id} className="flex flex-col gap-2"
                style={{ borderTop: "1px solid var(--border-hairline)", paddingTop: 12 }}>
              <div className="flex items-baseline justify-between gap-3">
                <p style={{ color: "var(--text-strong)" }}>{n.supply?.name ?? "Aporte económico"}</p>
                <span className="text-sm" style={{ color: "var(--text-faint)" }}>
                  {relativeTime(n.updated_at)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["urgente", "se_necesita", "cubierto"] as const).map((u) => (
                  <button key={u} type="button" className="chip"
                          aria-pressed={n.urgency === u}
                          onClick={() => ponerUrgencia(n.id, u)}>
                    {URGENCY_LABEL[u]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <select onChange={(e) => { void agregarInsumo(e.target.value); e.target.value = ""; }}
                defaultValue="" style={campo}>
          <option value="" disabled>Agregar un insumo del catálogo…</option>
          {catalogo.map((c) => (
            <option key={c.id} value={c.id}>{c.category} · {c.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
