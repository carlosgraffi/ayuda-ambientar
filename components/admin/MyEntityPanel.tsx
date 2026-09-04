"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  ShieldCheck,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { relativeTime } from "@/lib/format";
import { URGENCY_LABEL, VERIFICATION_LABEL } from "@/lib/types";
import { OrgPicker } from "@/components/admin/OrgPicker";

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
  endorser_org_id: string;
  endorser: { name: string } | null;
}

/**
 * Cómo se lee cada estado desde el lado de quien pidió el aval: un badge
 * y un ícono, no una oración — la lista tiene que escanearse de un
 * vistazo desde el celular.
 */
const AVAL_UI: Record<
  string,
  { label: string; badge: string; Icono: typeof CircleCheck }
> = {
  activo: { label: "Avaló", badge: "badge-accent", Icono: CircleCheck },
  solicitado: { label: "Esperando respuesta", badge: "badge-outline", Icono: CircleDashed },
  ignorado: { label: "Sin respuesta", badge: "badge-neutral", Icono: CircleMinus },
  en_revision: { label: "En revisión", badge: "badge-warning", Icono: AlertTriangle },
  revocado: { label: "Revocado", badge: "badge-neutral", Icono: CircleMinus },
};

const CHECK_UI: Record<string, { label: string; badge: string }> = {
  ok: { label: "Confirmado", badge: "badge-accent" },
  pendiente: { label: "Pendiente", badge: "badge-outline" },
  observado: { label: "Observado", badge: "badge-warning" },
};

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
  const [errorAval, setErrorAval] = useState<string | null>(null);
  const [nuevoInsumo, setNuevoInsumo] = useState("");
  const [nuevaCantidad, setNuevaCantidad] = useState("");

  const cargar = useCallback(async () => {
    const [n, c, a, ch] = await Promise.all([
      db.from("org_needs")
        .select("id, urgency, quantity_note, delivery_note, updated_at, supply:supply_catalog(id, name)")
        .eq("org_id", entidad.id)
        // Orden estable a propósito: sin esto Postgres devuelve las filas
        // en cualquier orden y la lista salta al editar una cantidad.
        .order("id"),
      db.from("supply_catalog").select("id, name, category").order("position"),
      db.from("endorsements")
        .select("id, status, endorser_org_id, endorser:organizations!endorsements_endorser_org_id_fkey(name)")
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

  async function agregarInsumo() {
    if (!nuevoInsumo) return;
    await db.from("org_needs").insert({
      org_id: entidad.id, kind: "insumos", supply_id: nuevoInsumo,
      urgency: "se_necesita", quantity_note: nuevaCantidad.trim() || null,
    });
    setNuevoInsumo("");
    setNuevaCantidad("");
    await cargar();
    void publicarSilencioso();
  }

  async function ponerCantidad(id: string, quantity_note: string | null) {
    await db.from("org_needs").update({ quantity_note }).eq("id", id);
    await cargar();
    void publicarSilencioso();
  }

  /**
   * Quitar borra de verdad, sin arrepentimiento — a diferencia del resto
   * del esquema, una necesidad no es un registro de auditoría: "cubierto"
   * es el cierre con historia, esto es para el ítem agregado por error.
   */
  async function quitarNecesidad(id: string) {
    await db.from("org_needs").delete().eq("id", id);
    await cargar();
    void publicarSilencioso();
  }

  /**
   * Pedir un aval después del registro. La política de la base ya lo
   * permitía (hasta 3 en total); lo que faltaba era esta puerta.
   */
  async function pedirAval(endorserId: string) {
    const { data } = await db.auth.getUser();
    const { error } = await db.from("endorsements").insert({
      endorser_org_id: endorserId, endorsed_org_id: entidad.id,
      status: "solicitado", created_by: data.user?.id,
    });
    setErrorAval(error?.message ?? null);
    await cargar();
  }

  /**
   * Retirar un pedido hecho por error. Sólo mientras nadie respondió: la
   * política de la base exige status 'solicitado', y el `.select()` es
   * para no decir "cancelado" sobre algo que la política filtró.
   */
  async function cancelarPedido(id: string) {
    const { data, error } = await db
      .from("endorsements")
      .delete()
      .eq("id", id)
      .eq("status", "solicitado")
      .select("id");
    setErrorAval(
      error?.message ??
        (!data?.length ? "No se pudo cancelar: el pedido ya fue respondido." : null),
    );
    await cargar();
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
      <div className="card card-subtle flex flex-col gap-4" data-tour="verificacion">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Verificación</p>
          {f.verification_level >= 2 ? (
            <span className="badge shrink-0"
                  style={{ background: "var(--verde-50)", color: "var(--verde-700)" }}>
              <ShieldCheck size={12} strokeWidth={2} aria-hidden />
              {VERIFICATION_LABEL[2]}
            </span>
          ) : f.verification_level === 1 ? (
            <span className="badge badge-warning shrink-0">{VERIFICATION_LABEL[1]}</span>
          ) : (
            <span className="badge badge-neutral shrink-0">Sin publicar</span>
          )}
        </div>

        {f.verification_level === 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Tenés <b style={{ color: "var(--text-strong)" }}>{activos} de 2</b>{" "}
            avales activos{huella ? " y huella pública confirmada" : ""}.
            {activos >= 1 && !huella
              ? " Con un aval más te publicás sola — o cuando la moderación confirme tu huella pública."
              : " Con dos avales de organizaciones verificadas tu entidad se publica sola."}
          </p>
        )}
        {f.moderation_note && (
          <p className="text-sm flex items-start gap-2" style={{ color: "var(--warning)" }}>
            <AlertTriangle size={15} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0" />
            <span>Mensaje de moderación: {f.moderation_note}</span>
          </p>
        )}

        {avales.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="metric-label">Tus avales</span>
            <ul className="flex flex-col gap-1.5">
              {avales.map((a) => {
                const ui = AVAL_UI[a.status] ?? AVAL_UI.solicitado;
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3"
                      style={{
                        background: "var(--surface-card)",
                        border: "1px solid var(--border-hairline)",
                        borderRadius: "var(--r-field)",
                        padding: "10px 14px",
                      }}>
                    <span className="flex min-w-0 items-center gap-2">
                      <ui.Icono size={16} strokeWidth={1.75} aria-hidden
                                style={{ color: "var(--text-faint)" }} className="shrink-0" />
                      <span className="truncate" style={{ color: "var(--text-strong)" }}>
                        {a.endorser?.name}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className={`badge ${ui.badge}`}>{ui.label}</span>
                      {a.status === "solicitado" && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void cancelarPedido(a.id)}
                          aria-label={`Cancelar el pedido a ${a.endorser?.name ?? "esta organización"}`}
                        >
                          Cancelar
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Pedir un aval: la mitad del camino a publicarse. Se muestra
            mientras quede cupo (la base admite hasta 3 pedidos). */}
        {avales.length < 3 && (
          <div className="flex flex-col gap-2">
            <span className="metric-label">Pedir un aval</span>
            <OrgPicker
              db={db}
              excluir={[entidad.id, ...avales.map((a) => a.endorser_org_id)]}
              provincia={entidad.province}
              onPick={(o) => void pedirAval(o.id)}
              placeholder="Elegí quién te conoce del directorio…"
            />
            {errorAval && (
              <p className="text-sm" style={{ color: "var(--danger)" }}>{errorAval}</p>
            )}
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>
              El pedido le llega a esa organización en su propio panel. Un
              aval vale cuando quien lo da está verificada.
            </p>
          </div>
        )}

        {checks.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="metric-label">Checklist de moderación</span>
            <ul className="flex flex-col gap-1.5">
              {checks.map((c, i) => {
                const ui = CHECK_UI[c.result] ?? CHECK_UI.pendiente;
                return (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {CHECK_LABEL[c.check_type] ?? c.check_type}
                    </span>
                    <span className={`badge shrink-0 ${ui.badge}`}>{ui.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
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
            <FilaNecesidad
              key={n.id}
              n={n}
              campo={campo}
              onUrgencia={(u) => void ponerUrgencia(n.id, u)}
              onCantidad={(q) => void ponerCantidad(n.id, q)}
              onQuitar={() => void quitarNecesidad(n.id)}
            />
          ))}
        </ul>
        {/* Alta explícita: elegir del catálogo, cantidad opcional, botón.
            El catálogo esconde lo que ya está en la lista. */}
        <div className="flex flex-col gap-2"
             style={{ borderTop: "1px solid var(--border-hairline)", paddingTop: 12 }}>
          <span className="metric-label">Agregar un insumo</span>
          <div className="flex flex-wrap gap-2">
            <select value={nuevoInsumo} onChange={(e) => setNuevoInsumo(e.target.value)}
                    style={{ ...campo, width: "auto", flex: "2 1 220px" }}>
              <option value="">Elegí del catálogo…</option>
              {catalogo
                .filter((c) => !necesidades.some((n) => n.supply?.id === c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.category} · {c.name}</option>
                ))}
            </select>
            <input
              value={nuevaCantidad}
              onChange={(e) => setNuevaCantidad(e.target.value)}
              placeholder="Cantidad (ej: 20 pares)"
              style={{ ...campo, width: "auto", flex: "1 1 160px" }}
            />
            <button type="button" className="btn btn-secondary btn-sm"
                    disabled={!nuevoInsumo} onClick={() => void agregarInsumo()}>
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Una necesidad: urgencia en tres toques, cantidad editable, quitar.
 * La cantidad se guarda al salir del campo — sin botón, porque quien la
 * escribe está apurado y "tocar afuera" es lo que hace igual.
 */
function FilaNecesidad({
  n,
  campo,
  onUrgencia,
  onCantidad,
  onQuitar,
}: {
  n: Necesidad;
  campo: React.CSSProperties;
  onUrgencia: (u: Necesidad["urgency"]) => void;
  onCantidad: (q: string | null) => void;
  onQuitar: () => void;
}) {
  const [cantidad, setCantidad] = useState(n.quantity_note ?? "");

  return (
    <li className="flex flex-col gap-2"
        style={{ borderTop: "1px solid var(--border-hairline)", paddingTop: 12 }}>
      <div className="flex items-baseline justify-between gap-3">
        <p style={{ color: "var(--text-strong)" }}>{n.supply?.name ?? "Aporte económico"}</p>
        <span className="flex items-baseline gap-3">
          <span className="text-sm" style={{ color: "var(--text-faint)" }}>
            {relativeTime(n.updated_at)}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onQuitar}
                  aria-label={`Quitar ${n.supply?.name ?? "esta necesidad"}`}>
            Quitar
          </button>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(["urgente", "se_necesita", "cubierto"] as const).map((u) => (
          <button key={u} type="button" className="chip"
                  aria-pressed={n.urgency === u}
                  onClick={() => onUrgencia(u)}>
            {URGENCY_LABEL[u]}
          </button>
        ))}
        <input
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          onBlur={() => {
            const limpia = cantidad.trim();
            if (limpia !== (n.quantity_note ?? "")) onCantidad(limpia || null);
          }}
          placeholder="Cantidad (ej: 20 pares)"
          style={{ ...campo, width: "auto", flex: "1 1 160px" }}
        />
      </div>
    </li>
  );
}
