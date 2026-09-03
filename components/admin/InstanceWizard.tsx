"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROVINCIAS } from "@/lib/provincias";

/**
 * El wizard de instancias: una emergencia nueva en menos de cinco minutos.
 *
 * Elegir el tipo de desastre precarga los insumos sugeridos y fija la
 * paleta — quien crea la instancia no elige colores, elige qué pasó. Al
 * publicar, las entidades verificadas de la zona pueden activarse en un
 * paso; las que se verifiquen después entran solas.
 *
 * Sólo lo ve el superadmin: la política de la base es la que manda, esta
 * pantalla no aparece para nadie más.
 */

interface Tipo {
  key: string;
  name: string;
  palette: "fuego" | "agua" | "viento" | null;
}

export function InstanceWizard({ db, onCreated }: { db: SupabaseClient; onCreated: () => void }) {
  const [esSuper, setEsSuper] = useState(false);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [sugeridos, setSugeridos] = useState<string[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<"inicial" | "creando" | "creado">("inicial");
  const [error, setError] = useState<string | null>(null);
  const [activables, setActivables] = useState(0);

  const [f, setF] = useState({
    tipo: "incendio_forestal",
    provincias: [] as string[],
    nombre: "",
    lead: "",
    fuente: "",
  });

  useEffect(() => {
    void db.from("super_admins").select("user_id").limit(1)
      .then(({ data }) => setEsSuper(Boolean(data?.length)));
    void db.from("disaster_types").select("key, name, palette").order("position")
      .then(({ data }) => setTipos((data ?? []) as Tipo[]));
  }, [db]);

  useEffect(() => {
    void db
      .from("disaster_type_supplies")
      .select("supply:supply_catalog(name)")
      .eq("disaster_type_key", f.tipo)
      .then(({ data }) =>
        setSugeridos(((data ?? []) as never[]).map((d: any) => d.supply?.name).filter(Boolean)),
      );
  }, [db, f.tipo]);

  useEffect(() => {
    if (!f.provincias.length) return setActivables(0);
    void db
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .in("province", f.provincias)
      .gte("verification_level", 1)
      .then(({ count }) => setActivables(count ?? 0));
  }, [db, f.provincias]);

  const year = new Date().getFullYear();
  const tipoElegido = tipos.find((t) => t.key === f.tipo);
  const nombreAuto = useMemo(
    () => `${tipoElegido?.name ?? ""} — ${f.provincias.join(", ") || "…"}`,
    [tipoElegido, f.provincias],
  );
  const slug = useMemo(() => {
    const base = (f.nombre || nombreAuto)
      .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${base}-${year}`.slice(0, 60);
  }, [f.nombre, nombreAuto, year]);

  if (!esSuper) return null;

  if (!abierto)
    return (
      <div data-tour="wizard">
        <button className="btn btn-secondary btn-sm" onClick={() => setAbierto(true)}>
          Abrir una instancia nueva
        </button>
      </div>
    );

  async function crear() {
    setEstado("creando");
    setError(null);
    const nombre = f.nombre || nombreAuto;

    const { data: tenant, error: e1 } = await db
      .from("tenants")
      .insert({
        slug,
        campaign_key: slug.replace(`-${year}`, ""),
        year,
        name: nombre,
        short_name: f.provincias[0] ?? nombre,
        headline: `¿Cómo **ayudar** con ${nombre.toLowerCase()}?`,
        lead: f.lead || `Organizaciones que trabajan sobre la emergencia, relevadas y verificadas.`,
        disaster_type: tipoElegido?.palette ?? "viento",
        disaster_type_key: f.tipo,
        emergency_status: "activa",
        provinces: f.provincias,
        official_links: f.fuente ? [{ url: f.fuente }] : [],
      })
      .select("id")
      .single();

    if (e1 || !tenant) {
      setError(e1?.message ?? "No se pudo crear.");
      setEstado("inicial");
      return;
    }

    // Activar lo ya verificado de la zona: entra en un paso, no una por una.
    if (activables > 0) {
      const { data: orgs } = await db
        .from("organizations")
        .select("id")
        .in("province", f.provincias)
        .gte("verification_level", 1);
      if (orgs?.length) {
        await db.from("event_activations").insert(
          orgs.map((o) => ({ tenant_id: tenant.id, org_id: o.id })),
        );
      }
    }

    setEstado("creado");
    onCreated();
  }

  const campo = {
    background: "var(--surface-card)",
    border: "1px solid var(--border-hairline)",
    borderRadius: "var(--r-field)",
    color: "var(--text-strong)",
    padding: "10px 14px",
    width: "100%",
  } as const;

  if (estado === "creado")
    return (
      <div className="card flex flex-col gap-2">
        <p className="eyebrow">Instancia creada</p>
        <p style={{ color: "var(--text-muted)" }}>
          <b style={{ color: "var(--text-strong)" }}>{slug}</b> está en la base
          con sus entidades activadas. Falta <b>publicar los cambios</b> para
          que el sitio la muestre.
        </p>
      </div>
    );

  return (
    <div className="card flex flex-col gap-4" data-tour="wizard">
      <div className="flex items-start justify-between">
        <p className="eyebrow">Instancia nueva</p>
        <button className="btn btn-ghost btn-sm" onClick={() => setAbierto(false)}>Cerrar</button>
      </div>

      <label className="flex flex-col gap-2">
        <span className="metric-label">Qué pasó</span>
        <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} style={campo}>
          {tipos.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <span className="metric-label">Zona afectada</span>
        <div className="flex flex-wrap gap-1.5">
          {PROVINCIAS.map((p) => (
            <button key={p} type="button" className="chip"
                    aria-pressed={f.provincias.includes(p)}
                    onClick={() =>
                      setF({
                        ...f,
                        provincias: f.provincias.includes(p)
                          ? f.provincias.filter((x) => x !== p)
                          : [...f.provincias, p],
                      })}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="metric-label">Nombre</span>
        <input value={f.nombre} placeholder={nombreAuto}
               onChange={(e) => setF({ ...f, nombre: e.target.value })} style={campo} />
        <span className="text-sm" style={{ color: "var(--text-faint)" }}>/{slug}</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="metric-label">Fuente oficial (Defensa Civil, SPLIF…)</span>
        <input value={f.fuente} placeholder="https://…"
               onChange={(e) => setF({ ...f, fuente: e.target.value })} style={campo} />
      </label>

      {sugeridos.length > 0 && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Insumos sugeridos para este tipo (las entidades eligen del catálogo
          completo): {sugeridos.join(", ")}.
        </p>
      )}

      {f.provincias.length > 0 && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {activables} entidades verificadas de la zona se activan al crear.
        </p>
      )}

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <button className="btn btn-primary btn-md self-start"
              disabled={estado === "creando" || !f.provincias.length}
              onClick={crear}>
        {estado === "creando" ? "Creando…" : "Crear y activar la zona"}
      </button>
    </div>
  );
}
