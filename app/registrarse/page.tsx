"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { brand } from "@/lib/brand";
import { getBrowserClient } from "@/lib/admin/browser";
import { PROVINCIAS } from "@/lib/provincias";
import { ORG_TYPE_LABEL, type OrgType } from "@/lib/types";
import { TopBar } from "@/components/site/TopBar";

/**
 * Auto-registro de entidades: el fin del cuello de botella.
 *
 * Hasta la v1, cada organización la cargaba el administrador a mano. Acá
 * la carga su propia responsable, desde el celular, en el medio de la
 * emergencia. Lo que NO cambia es la regla de publicación: la entidad
 * entra en nivel 0, que no se publica en ningún lado. Se publica cuando
 * la comunidad la avala (nivel 1) o una persona moderadora la verifica
 * (nivel 2).
 *
 * El formulario pide lo mínimo que la verificación va a necesitar: el
 * alias CON su titular declarado, la zona (que decide qué moderador la
 * ve), y hasta tres organizaciones que puedan dar fe de que existe.
 */

const TIPOS: OrgType[] = [
  "brigada", "bomberos", "ong", "viandas", "municipio", "red_informal", "comunidad", "otro",
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

export default function Registrarse() {
  const [db, setDb] = useState<SupabaseClient | null>(null);
  const [listo, setListo] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    getBrowserClient().then(async (c) => {
      setDb(c);
      if (c) {
        const { data } = await c.auth.getSession();
        setSession(data.session);
        c.auth.onAuthStateChange((_e, s) => setSession(s));
      }
      setListo(true);
    });
  }, []);

  return (
    <>
      <TopBar />
      <main id="contenido" className="container section-tight">
        <div className="container-text flex flex-col gap-6">
          <div>
            <p className="eyebrow">Registrá tu organización</p>
            <h1 className="display-2 mt-3">
              Sumate al directorio, <b>verificable</b> desde el primer día
            </h1>
          </div>
          <p className="lead">
            Cargás tus datos una vez y quedan listos para la próxima
            emergencia. Nada se publica hasta que otras organizaciones te
            avalen o una persona moderadora confirme la titularidad de tu
            cuenta: esa es la diferencia entre este directorio y una cadena
            de alias por Instagram.
          </p>

          {!listo ? null : !db ? (
            <div className="card">
              <p style={{ color: "var(--text-muted)" }}>
                El registro no está disponible en este despliegue. Escribinos
                a <a href={`mailto:${brand.contactEmail}`}>{brand.contactEmail}</a>.
              </p>
            </div>
          ) : !session ? (
            <Cuenta db={db} />
          ) : (
            <FormularioEntidad db={db} userId={session.user.id} />
          )}
        </div>
      </main>
    </>
  );
}

/** Paso 1: la cuenta de quien va a administrar la entidad. */
function Cuenta({ db }: { db: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [estado, setEstado] = useState<"inicial" | "enviando" | "confirmar">("inicial");
  const [error, setError] = useState<string | null>(null);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setError(null);
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/registrarse/` },
    });
    if (error) {
      // La cuenta puede existir de antes: probar entrar directo.
      const intento = await db.auth.signInWithPassword({ email, password });
      if (intento.error) {
        setError(error.message);
        setEstado("inicial");
      }
      return;
    }
    if (!data.session) setEstado("confirmar");
  }

  if (estado === "confirmar") {
    return (
      <div className="card flex flex-col gap-2">
        <p className="eyebrow">Confirmá tu correo</p>
        <p style={{ color: "var(--text-muted)" }}>
          Te mandamos un enlace a {email}. Al abrirlo volvés acá y seguís con
          los datos de tu organización.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={crear} className="card flex flex-col gap-4">
      <p className="eyebrow">1 · Tu cuenta</p>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Es la cuenta de la persona responsable, no de la organización: las
        verificaciones registran quién declaró qué.
      </p>
      <label className="flex flex-col gap-2">
        <span className="metric-label">Correo</span>
        <input type="email" required value={email}
               onChange={(e) => setEmail(e.target.value)} style={campo}
               autoComplete="email" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="metric-label">Contraseña</span>
        <input type="password" required minLength={8} value={password}
               onChange={(e) => setPassword(e.target.value)} style={campo}
               autoComplete="new-password" />
      </label>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <button type="submit" className="btn btn-primary btn-md self-start"
              disabled={estado === "enviando"}>
        {estado === "enviando" ? "Un momento…" : "Crear la cuenta"}
      </button>
    </form>
  );
}

/** Pasos 2 y 3: la entidad y sus avales. */
function FormularioEntidad({ db, userId }: { db: SupabaseClient; userId: string }) {
  const [f, setF] = useState({
    name: "", type: "brigada" as OrgType, description: "",
    province: "", locality: "", contact_email: "", contact_phone: "",
    alias: "", holder_name: "", instagram: "", web: "",
  });
  const [busqueda, setBusqueda] = useState("");
  const [candidatas, setCandidatas] = useState<{ id: string; name: string }[]>([]);
  const [sugeridas, setSugeridas] = useState<
    { id: string; name: string; is_validator: boolean; verification_level: number; province: string | null }[]
  >([]);
  const [avales, setAvales] = useState<{ id: string; name: string }[]>([]);
  const [estado, setEstado] = useState<"inicial" | "enviando" | "enviado">("inicial");
  const [error, setError] = useState<string | null>(null);

  const slug = useMemo(
    () =>
      f.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    [f.name],
  );

  /* El directorio a la vista antes de pedir que busquen: nadie tiene por
     qué saber el nombre exacto de la brigada de al lado. */
  useEffect(() => {
    void db
      .from("organizations")
      .select("id, name, is_validator, verification_level, province")
      .gte("verification_level", 1)
      .limit(30)
      .then(({ data }) => setSugeridas((data ?? []) as never[]));
  }, [db]);

  useEffect(() => {
    if (busqueda.trim().length < 3) return setCandidatas([]);
    const t = setTimeout(async () => {
      const { data } = await db
        .from("organizations")
        .select("id, name")
        .ilike("name", `%${busqueda.trim()}%`)
        .limit(5);
      setCandidatas((data ?? []).filter((c) => !avales.some((a) => a.id === c.id)));
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda, db, avales]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setError(null);

    const { data: org, error: e1 } = await db
      .from("organizations")
      .insert({
        slug, name: f.name, type: f.type, description: f.description,
        province: f.province, locality: f.locality || null,
        contact_email: f.contact_email || null,
        contact_phone: f.contact_phone || null,
        holder_name: f.holder_name || null,
        holder_status: f.holder_name ? "declarado" : "no_declarado",
        status: "en_revision", owner_user_id: userId,
      })
      .select("id")
      .single();

    if (e1 || !org) {
      setError(
        e1?.code === "23505"
          ? "Ya hay una entidad registrada con un nombre muy parecido. Si es la tuya, escribinos."
          : (e1?.message ?? "No se pudo registrar."),
      );
      setEstado("inicial");
      return;
    }

    if (f.alias) {
      await db.from("org_channels").insert({
        org_id: org.id, rail: "alias_ar", identifier: f.alias, position: 0,
      });
    }
    const links = [
      f.instagram && {
        org_id: org.id, kind: "instagram",
        handle: f.instagram.startsWith("@") ? f.instagram : `@${f.instagram}`,
        url: `https://instagram.com/${f.instagram.replace(/^@/, "")}`,
      },
      f.web && { org_id: org.id, kind: "web", url: f.web },
    ].filter(Boolean);
    if (links.length) await db.from("org_links").insert(links as never[]);

    if (avales.length) {
      await db.from("endorsements").insert(
        avales.map((a) => ({
          endorser_org_id: a.id, endorsed_org_id: org.id,
          status: "solicitado", created_by: userId,
        })),
      );
    }

    setEstado("enviado");
  }

  if (estado === "enviado") {
    return (
      <div className="card flex flex-col gap-3">
        <p className="eyebrow">Registro recibido</p>
        <h2 className="heading-2">Quedaste en la cola de verificación</h2>
        <p style={{ color: "var(--text-muted)" }}>
          Tu entidad todavía no es pública — y eso es una garantía, no una
          traba: nadie puede aparecer en el listado sin que alguien dé fe.
          {avales.length > 0 &&
            " Las organizaciones que indicaste van a recibir tu pedido de aval."}{" "}
          Podés seguir el estado y actualizar tus datos desde{" "}
          <a href="/admin/">tu panel</a>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-6">
      <div className="card flex flex-col gap-4">
        <p className="eyebrow">2 · Tu organización</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="metric-label">Nombre</span>
            <input required value={f.name}
                   onChange={(e) => setF({ ...f, name: e.target.value })} style={campo} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="metric-label">Qué es</span>
            <select value={f.type}
                    onChange={(e) => setF({ ...f, type: e.target.value as OrgType })}
                    style={campo}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{ORG_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="metric-label">Provincia</span>
            <select required value={f.province}
                    onChange={(e) => setF({ ...f, province: e.target.value })} style={campo}>
              <option value="">Elegí…</option>
              {PROVINCIAS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="metric-label">Localidad</span>
            <input value={f.locality}
                   onChange={(e) => setF({ ...f, locality: e.target.value })} style={campo} />
          </label>
        </div>
        <label className="flex flex-col gap-2">
          <span className="metric-label">Qué hacen</span>
          <textarea required rows={3} value={f.description}
                    onChange={(e) => setF({ ...f, description: e.target.value })}
                    placeholder="En una o dos frases: a quién ayudan y cómo."
                    style={{ ...campo, minHeight: 0 }} />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="metric-label">Correo de contacto</span>
            <input type="email" value={f.contact_email}
                   onChange={(e) => setF({ ...f, contact_email: e.target.value })} style={campo} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="metric-label">Teléfono</span>
            <input value={f.contact_phone}
                   onChange={(e) => setF({ ...f, contact_phone: e.target.value })} style={campo} />
          </label>
        </div>
      </div>

      <div className="card flex flex-col gap-4">
        <p className="eyebrow">3 · Para recibir donaciones</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          El titular es lo primero que se verifica: el nombre al que resuelve
          el alias tiene que coincidir con la entidad o con una persona
          responsable identificada. Se muestra públicamente junto al alias.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="metric-label">Alias bancario</span>
            <input value={f.alias}
                   onChange={(e) => setF({ ...f, alias: e.target.value })} style={campo} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="metric-label">Titular de la cuenta</span>
            <input value={f.holder_name}
                   onChange={(e) => setF({ ...f, holder_name: e.target.value })} style={campo} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="metric-label">Instagram</span>
            <input value={f.instagram} placeholder="@tuorganizacion"
                   onChange={(e) => setF({ ...f, instagram: e.target.value })} style={campo} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="metric-label">Sitio web</span>
            <input value={f.web} placeholder="https://…"
                   onChange={(e) => setF({ ...f, web: e.target.value })} style={campo} />
          </label>
        </div>
      </div>

      <div className="card flex flex-col gap-4">
        <p className="eyebrow">4 · Quiénes te conocen</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Indicá hasta tres organizaciones del directorio que puedan dar fe de
          que existís. Con dos avales tu entidad se publica sola, sin esperar
          a nadie.
        </p>
        {avales.length < 3 && (() => {
          /* Del directorio: las de tu provincia primero, validadoras antes
             que el resto; el buscador queda para lo que no está a mano. */
          const orden = (o: (typeof sugeridas)[number]) =>
            (f.province && o.province === f.province ? 0 : 4) +
            (o.is_validator ? 0 : 2) +
            (o.verification_level >= 2 ? 0 : 1);
          const enJuego = busqueda.trim().length >= 3
            ? candidatas
            : [...sugeridas]
                .filter((s) => !avales.some((a) => a.id === s.id))
                .sort((a, b) => orden(a) - orden(b) || a.name.localeCompare(b.name))
                .slice(0, 6);
          return enJuego.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {enJuego.map((c) => (
                <button key={c.id} type="button" className="chip"
                        onClick={() => { setAvales([...avales, c]); setBusqueda(""); }}>
                  + {c.name}
                </button>
              ))}
            </div>
          ) : null;
        })()}
        {avales.length < 3 && (
          <input value={busqueda} placeholder="¿No está en la lista? Buscala por nombre…"
                 onChange={(e) => setBusqueda(e.target.value)} style={campo} />
        )}
        {avales.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {avales.map((a) => (
              <button key={a.id} type="button" className="chip" data-selected="true"
                      onClick={() => setAvales(avales.filter((x) => x.id !== a.id))}>
                {a.name} ×
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <button type="submit" className="btn btn-primary btn-lg self-start"
              disabled={estado === "enviando"}>
        {estado === "enviando" ? "Registrando…" : "Registrar mi organización"}
      </button>
    </form>
  );
}
