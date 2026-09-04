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
  endorser_org_id: string;
  endorser: { name: string } | null;
}

/** Cómo se lee cada estado desde el lado de quien pidió el aval. */
const AVAL_LABEL: Record<string, string> = {
  solicitado: "pedido enviado, sin respuesta todavía",
  activo: "avaló",
  ignorado: "no respondió",
  en_revision: "en revisión",
  revocado: "revocado",
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
  const [busqueda, setBusqueda] = useState("");
  const [candidatas, setCandidatas] = useState<{ id: string; name: string }[]>([]);
  const [sugeridas, setSugeridas] = useState<{ id: string; name: string }[]>([]);
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
    setBusqueda("");
    setCandidatas([]);
    await cargar();
  }

  /**
   * El directorio primero, la búsqueda después: quien pide un aval no
   * tiene por qué saber cómo se llama exactamente cada organización.
   * Verificadas de su provincia arriba, validadoras antes que el resto.
   */
  useEffect(() => {
    void db
      .from("organizations")
      .select("id, name, is_validator, verification_level, province")
      .gte("verification_level", 1)
      .neq("id", entidad.id)
      .limit(30)
      .then(({ data }) => {
        const orden = (o: { is_validator: boolean; verification_level: number; province: string | null }) =>
          (o.province === entidad.province ? 0 : 4) +
          (o.is_validator ? 0 : 2) +
          (o.verification_level >= 2 ? 0 : 1);
        setSugeridas(
          (data ?? [])
            .sort((a, b) => orden(a) - orden(b) || a.name.localeCompare(b.name))
            .slice(0, 6)
            .map((o) => ({ id: o.id, name: o.name })),
        );
      });
  }, [db, entidad.id, entidad.province]);

  /* Mismo buscador que /registrarse: por nombre, de a 5, excluyendo la
     propia entidad y las que ya están en la lista. */
  useEffect(() => {
    if (busqueda.trim().length < 3) {
      setCandidatas([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await db
        .from("organizations")
        .select("id, name")
        .ilike("name", `%${busqueda.trim()}%`)
        .neq("id", entidad.id)
        .limit(5);
      setCandidatas(
        (data ?? []).filter((c) => !avales.some((a) => a.endorser_org_id === c.id)),
      );
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda, db, entidad.id, avales]);

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
                {a.endorser?.name} — {AVAL_LABEL[a.status] ?? a.status}
              </li>
            ))}
          </ul>
        )}
        {/* Pedir un aval: la mitad del camino a publicarse. Se muestra
            mientras quede cupo (la base admite hasta 3 pedidos). */}
        {avales.length < 3 && (
          <div className="flex flex-col gap-2">
            <span className="metric-label">Pedir un aval</span>
            {/* Primero el directorio; el buscador es para lo que no está
                a la vista. */}
            {(() => {
              const enJuego = busqueda.trim().length >= 3
                ? candidatas
                : sugeridas.filter((s) => !avales.some((a) => a.endorser_org_id === s.id));
              return enJuego.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {enJuego.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="chip" onClick={() => void pedirAval(c.id)}>
                        Pedirle aval a {c.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null;
            })()}
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="¿No está en la lista? Buscala por nombre…"
              style={campo}
            />
            {busqueda.trim().length >= 3 && candidatas.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No aparece ninguna con ese nombre. Sólo se puede pedir aval a
                organizaciones ya registradas.
              </p>
            )}
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
