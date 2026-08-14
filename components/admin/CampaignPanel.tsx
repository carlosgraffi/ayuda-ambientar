"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, RefreshCw } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { relativeTime } from "@/lib/format";
import { OrgEditor, verificacionVigente, type OrgFila } from "./OrgEditor";

/**
 * Una campaña: sus organizaciones y su estado.
 *
 * Lo que ordena la lista no es el alfabeto sino el trabajo pendiente:
 * primero lo que no está publicado y lo que tiene la verificación vencida,
 * porque es lo que alguien tiene que mirar. Una lista alfabética se ve más
 * prolija y esconde justo lo que importa.
 */

export interface CampaignFila {
  id: string;
  slug: string;
  name: string;
  year: number;
  closed_at: string | null;
  last_reviewed_at: string;
  results: { notMeasured?: string } | null;
}

type Pendiente = "sin_publicar" | "vencida" | "ok";

function pendiente(o: OrgFila): Pendiente {
  if (o.status !== "verificada" && o.status !== "pausada") return "sin_publicar";
  return verificacionVigente(o) ? "ok" : "vencida";
}

export function CampaignPanel({
  db,
  campaign,
  onBack,
}: {
  db: SupabaseClient;
  campaign: CampaignFila;
  onBack: () => void;
}) {
  const [orgs, setOrgs] = useState<OrgFila[] | null>(null);
  const [editando, setEditando] = useState<OrgFila | null>(null);
  const [publicando, setPublicando] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState(false);

  async function cargar() {
    const { data } = await db
      .from("organizations")
      .select(
        "id, slug, name, type, description, holder_name, holder_status, status, urgent, org_verifications ( verified_at, expires_at )",
      )
      .eq("tenant_id", campaign.id);
    setOrgs((data ?? []) as OrgFila[]);
  }

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id]);

  async function alternarCierre() {
    setCerrando(true);
    await db
      .from("tenants")
      .update({ closed_at: campaign.closed_at ? null : new Date().toISOString() })
      .eq("id", campaign.id);
    setCerrando(false);
    onBack();
  }

  /**
   * Reconstruye el sitio. El contenido se lee en el build, así que guardar
   * en la base no cambia lo que ve la gente hasta que esto corra.
   * El hook vive en el borde, no acá: es una URL que dispara un deploy y
   * en el navegador cualquiera podría usarla para gastar builds.
   */
  async function publicar() {
    setPublicando("Publicando…");
    const { data } = await db.auth.getSession();
    const r = await fetch("/api/publish", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    });
    setPublicando(
      r.ok
        ? "Listo. El sitio se actualiza en un par de minutos."
        : r.status === 501
          ? "Falta configurar el hook de publicación en Cloudflare."
          : "No se pudo publicar.",
    );
  }

  if (editando) {
    return (
      <OrgEditor
        db={db}
        org={editando}
        onClose={() => setEditando(null)}
        onSaved={() => {
          setEditando(null);
          void cargar();
        }}
      />
    );
  }

  const orden: Record<Pendiente, number> = { sin_publicar: 0, vencida: 1, ok: 2 };
  const lista = [...(orgs ?? [])].sort(
    (a, b) =>
      orden[pendiente(a)] - orden[pendiente(b)] ||
      a.name.localeCompare(b.name, "es"),
  );
  const aRevisar = lista.filter((o) => pendiente(o) !== "ok").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            ← Campañas
          </button>
          <h1 className="heading-2 mt-2">
            {campaign.name} {campaign.year}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Revisada {relativeTime(campaign.last_reviewed_at)} ·{" "}
            {campaign.closed_at ? "cerrada" : "abierta"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-secondary btn-sm" onClick={publicar}>
            <RefreshCw size={15} strokeWidth={1.75} aria-hidden />
            Publicar cambios
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={alternarCierre}
            disabled={cerrando}
          >
            {campaign.closed_at ? "Reabrir campaña" : "Cerrar campaña"}
          </button>
        </div>
      </div>

      {publicando && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {publicando}
        </p>
      )}

      {/* Guardar no publica. Decirlo evita que alguien crea que corrigió un
          alias en el sitio cuando sólo lo corrigió en la base. */}
      <div className="card card-subtle">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Los cambios se guardan al instante, pero el sitio público se
          reconstruye aparte: hasta que no aprietes <b>Publicar cambios</b>,
          la gente sigue viendo lo anterior.
        </p>
      </div>

      {campaign.closed_at && (
        <div className="card flex flex-col gap-2">
          <p className="eyebrow">Campaña cerrada</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            El sitio dejó de ofrecer transferir y muestra el resumen. Si algo
            no se midió, conviene decirlo ahí antes que publicar un cero.
          </p>
        </div>
      )}

      {orgs === null ? (
        <p style={{ color: "var(--text-muted)" }}>Cargando…</p>
      ) : (
        <>
          <div className="flex items-baseline gap-3">
            <p className="metric-label">
              {lista.length} organizaciones
            </p>
            {aRevisar > 0 && (
              <span className="badge badge-warning">
                <AlertTriangle size={12} strokeWidth={2} aria-hidden />
                {aRevisar} para revisar
              </span>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {lista.map((o) => {
              const p = pendiente(o);
              return (
                <li key={o.id}>
                  <button
                    onClick={() => setEditando(o)}
                    className="card card-hover flex w-full items-center justify-between gap-4 text-left"
                    style={{ padding: "14px 18px" }}
                  >
                    <span className="min-w-0">
                      <span
                        className="block truncate"
                        style={{ color: "var(--text-strong)" }}
                      >
                        {o.name}
                      </span>
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {o.type}
                        {o.holder_status !== "declarado" &&
                          " · sin titular declarado"}
                      </span>
                    </span>
                    {p === "sin_publicar" ? (
                      <span className="badge badge-neutral shrink-0">
                        {o.status.replace("_", " ")}
                      </span>
                    ) : p === "vencida" ? (
                      <span className="badge badge-warning shrink-0">
                        Verificación vencida
                      </span>
                    ) : (
                      <span className="badge badge-outline shrink-0">
                        <Check size={12} strokeWidth={2} aria-hidden />
                        Publicada
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
