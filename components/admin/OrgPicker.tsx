"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ShieldCheck, Users } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Selector de organizaciones del directorio.
 *
 * No es una barra de búsqueda: el directorio se carga entero una sola vez
 * y el filtro corre acá, sobre lo que ya está en memoria. La diferencia
 * importa — una búsqueda remota con mínimo de caracteres se siente rota
 * ("escribo y no pasa nada"), y con un directorio de decenas de filas no
 * hay nada que ganar yendo al servidor.
 *
 * El orden es el de la confianza útil: las de tu provincia primero,
 * validadoras antes que el resto, nivel 2 antes que nivel 1.
 */

export interface OrgOpcion {
  id: string;
  name: string;
  province: string | null;
  locality: string | null;
  verification_level: number;
  is_validator: boolean;
}

function normalizar(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function OrgPicker({
  db,
  excluir = [],
  provincia,
  onPick,
  placeholder = "Elegí una organización del directorio…",
}: {
  db: SupabaseClient;
  /** Ids que no se ofrecen: la propia entidad, las ya elegidas. */
  excluir?: string[];
  /** Prioriza las de esta provincia al tope de la lista. */
  provincia?: string | null;
  onPick: (org: OrgOpcion) => void;
  placeholder?: string;
}) {
  const [directorio, setDirectorio] = useState<OrgOpcion[] | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const raiz = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void db
      .from("organizations")
      .select("id, name, province, locality, verification_level, is_validator")
      .gte("verification_level", 1)
      .limit(200)
      .then(({ data }) => setDirectorio((data ?? []) as OrgOpcion[]));
  }, [db]);

  // Cerrar al tocar afuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", afuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", afuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  useEffect(() => {
    if (abierto) campo.current?.focus();
    else setFiltro("");
  }, [abierto]);

  const opciones = useMemo(() => {
    const orden = (o: OrgOpcion) =>
      (provincia && o.province === provincia ? 0 : 4) +
      (o.is_validator ? 0 : 2) +
      (o.verification_level >= 2 ? 0 : 1);
    const f = normalizar(filtro.trim());
    return (directorio ?? [])
      .filter((o) => !excluir.includes(o.id))
      .filter(
        (o) =>
          !f ||
          normalizar(`${o.name} ${o.locality ?? ""} ${o.province ?? ""}`).includes(f),
      )
      .sort((a, b) => orden(a) - orden(b) || a.name.localeCompare(b.name));
  }, [directorio, excluir, filtro, provincia]);

  const estiloCampo = {
    background: "var(--surface-card)",
    border: "1px solid var(--border-hairline)",
    borderRadius: "var(--r-field)",
    color: "var(--text-strong)",
    minHeight: "var(--touch-min)",
    padding: "10px 14px",
    width: "100%",
  } as const;

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        className="flex items-center justify-between gap-3 text-left"
        style={estiloCampo}
      >
        <span style={{ color: "var(--text-muted)" }}>{placeholder}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden
          style={{
            color: "var(--text-faint)",
            transform: abierto ? "rotate(180deg)" : undefined,
            transition: "transform 0.15s",
          }}
        />
      </button>

      {abierto && (
        <div
          className="card absolute left-0 right-0 z-20 flex flex-col gap-2"
          style={{ top: "calc(100% + 6px)", padding: 12 }}
        >
          <input
            ref={campo}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por nombre o lugar…"
            style={{ ...estiloCampo, minHeight: 40, padding: "8px 12px" }}
          />
          <ul
            role="listbox"
            className="flex flex-col overflow-y-auto"
            style={{ maxHeight: 280 }}
          >
            {directorio === null && (
              <li className="p-3 text-sm" style={{ color: "var(--text-muted)" }}>
                Cargando el directorio…
              </li>
            )}
            {directorio !== null && opciones.length === 0 && (
              <li className="p-3 text-sm" style={{ color: "var(--text-muted)" }}>
                {filtro
                  ? `Ninguna coincide con «${filtro.trim()}». Sólo aparecen organizaciones ya publicadas.`
                  : "Todavía no hay organizaciones publicadas en el directorio."}
              </li>
            )}
            {opciones.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  style={{
                    borderRadius: "var(--r-field)",
                    padding: "10px 12px",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--surface-card-subtle)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  onClick={() => {
                    onPick(o);
                    setAbierto(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate" style={{ color: "var(--text-strong)" }}>
                      {o.name}
                    </span>
                    <span className="block text-sm" style={{ color: "var(--text-muted)" }}>
                      {[o.locality, o.province].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </span>
                  {o.is_validator ? (
                    <span className="badge badge-accent shrink-0">
                      <ShieldCheck size={12} strokeWidth={2} aria-hidden />
                      Validadora
                    </span>
                  ) : o.verification_level >= 2 ? (
                    <span className="badge badge-outline shrink-0">Nivel 2</span>
                  ) : (
                    <span className="badge badge-outline shrink-0">
                      <Users size={12} strokeWidth={2} aria-hidden />
                      Nivel 1
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
