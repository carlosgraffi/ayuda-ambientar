"use client";

import { useMemo, useState } from "react";
import { Search, Shuffle, X } from "lucide-react";
import type { Organization, OrgType } from "@/lib/types";
import { ORG_TYPE_LABEL } from "@/lib/types";
import { OrgCard } from "./OrgCard";
import { Toast } from "./Toast";

/**
 * Lista de organizaciones con búsqueda y filtros.
 *
 * El filtro por tipo es lo que convierte 25 registros en algo elegible, y
 * sólo es posible porque `type` salió de adentro de la descripción. Los
 * chips seleccionados van en TINTA, no en el color del desastre:
 * seleccionar no es una acción, y el naranja ya está diciendo "fuego".
 */

type Filter = "todas" | "urgentes" | OrgType;

const TYPE_ORDER: OrgType[] = [
  "bomberos",
  "brigada",
  "viandas",
  "familias",
  "comunidad",
];

export function OrgList({ organizations }: { organizations: Organization[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");
  const [toast, setToast] = useState<string | null>(null);

  const counts = useMemo(() => {
    const byType = Object.fromEntries(
      TYPE_ORDER.map((t) => [t, 0]),
    ) as Record<OrgType, number>;
    let urgentes = 0;
    for (const org of organizations) {
      byType[org.type]++;
      if (org.urgent) urgentes++;
    }
    return { byType, urgentes, todas: organizations.length };
  }, [organizations]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return organizations
      .filter((org) => {
        if (filter === "urgentes" && !org.urgent) return false;
        if (filter !== "todas" && filter !== "urgentes" && org.type !== filter)
          return false;
        if (!q) return true;
        return (
          org.name.toLowerCase().includes(q) ||
          org.description.toLowerCase().includes(q) ||
          org.channels.some((c) => c.identifier.toLowerCase().includes(q)) ||
          (org.holderName?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => Number(b.urgent) - Number(a.urgent));
  }, [organizations, query, filter]);

  function pickRandom() {
    if (!visible.length) return;
    const org = visible[Math.floor(Math.random() * visible.length)];
    document
      .getElementById(`org-${org.slug}`)
      ?.scrollIntoView({ block: "center" });
    setToast(`Mirá ${org.name}`);
  }

  async function share(org: Organization) {
    const alias = org.channels[0]?.identifier;
    const text = `${org.name} — ${org.description}${
      alias ? ` Alias: ${alias}` : ""
    }`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: org.name, text, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setToast("Datos copiados para compartir");
    } catch {
      setToast("No se pudo compartir. Copiá el alias a mano.");
    }
  }

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "todas", label: "Todas", count: counts.todas },
    { id: "urgentes", label: "Urgentes", count: counts.urgentes },
    ...TYPE_ORDER.map((t) => ({
      id: t as Filter,
      label: ORG_TYPE_LABEL[t],
      count: counts.byType[t],
    })).filter((f) => f.count > 0),
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search
            size={18}
            strokeWidth={1.75}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
            style={{ color: "var(--text-faint)" }}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, alias o titular"
            aria-label="Buscar organizaciones"
            className="w-full py-3 pr-4 pl-11"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-hairline)",
              borderRadius: "var(--r-field)",
              color: "var(--text-strong)",
              minHeight: "var(--touch-min)",
            }}
          />
        </div>

        <div
          role="group"
          aria-label="Filtrar por tipo de organización"
          className="flex flex-wrap gap-2"
        >
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className="chip"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="chip-count">{f.count}</span>
            </button>
          ))}
          <button type="button" className="chip" onClick={pickRandom}>
            <Shuffle size={15} strokeWidth={1.75} aria-hidden />
            Elegir una al azar
          </button>
        </div>

        <p aria-live="polite" className="text-sm" style={{ color: "var(--text-muted)" }}>
          {visible.length === organizations.length
            ? `${organizations.length} organizaciones`
            : `${visible.length} de ${organizations.length} organizaciones`}
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="card card-subtle mt-6 flex flex-col items-start gap-3">
          <p style={{ color: "var(--text-muted)" }}>
            Ninguna organización coincide con esa búsqueda. Puede que esté
            relevada con otro nombre.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setQuery("");
              setFilter("todas");
            }}
          >
            <X size={15} strokeWidth={1.75} aria-hidden />
            Limpiar la búsqueda
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          {visible.map((org) => (
            <div key={org.slug} id={`org-${org.slug}`} style={{ scrollMarginTop: 88 }}>
              <OrgCard org={org} onShare={share} onCopied={setToast} />
            </div>
          ))}
        </div>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
