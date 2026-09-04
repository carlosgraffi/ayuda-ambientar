"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { relativeTime } from "@/lib/format";

/**
 * La bandeja de una organización validadora: entidades que la mencionaron
 * como referencia y esperan su aval.
 *
 * El aval pide una línea de contexto a propósito ("trabajamos juntos en el
 * incendio de 2025"): es público en el perfil de la avalada, y un aval que
 * no puede decir de dónde se conocen no está avalando nada. Avalar no es
 * aprobar — con dos avales el sistema publica en nivel 1, pero el nivel 2
 * sigue siendo de la moderación.
 */

interface Pedido {
  id: string;
  status: string;
  created_at: string;
  endorser_org_id: string;
  endorsed: {
    name: string;
    slug: string;
    description: string;
    locality: string | null;
    province: string | null;
  } | null;
}

export function ValidatorInbox({ db }: { db: SupabaseClient }) {
  const [misOrgs, setMisOrgs] = useState<string[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [nota, setNota] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    const { data: user } = await db.auth.getUser();
    if (!user.user) return;
    const { data: propias } = await db
      .from("organizations")
      .select("id, is_validator, verification_level")
      .eq("owner_user_id", user.user.id);
    const calificadas = (propias ?? [])
      .filter((o) => o.is_validator || o.verification_level === 2)
      .map((o) => o.id);
    setMisOrgs(calificadas);
    if (!calificadas.length) return setPedidos([]);

    const { data } = await db
      .from("endorsements")
      .select(
        "id, status, created_at, endorser_org_id, endorsed:organizations!endorsements_endorsed_org_id_fkey(name, slug, description, locality, province)",
      )
      .in("endorser_org_id", calificadas)
      .eq("status", "solicitado");
    setPedidos((data ?? []) as unknown as Pedido[]);
  }, [db]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function responder(p: Pedido, aceptar: boolean) {
    await db
      .from("endorsements")
      .update(
        aceptar
          ? { status: "activo", context_note: nota[p.id] || null, resolved_at: new Date().toISOString() }
          : { status: "ignorado", resolved_at: new Date().toISOString() },
      )
      .eq("id", p.id);
    await cargar();
  }

  if (!misOrgs.length || pedidos === null || pedidos.length === 0) return null;

  return (
    <div className="flex flex-col gap-4" data-tour="avales">
      <div>
        <p className="eyebrow">Organización validadora</p>
        <h2 className="heading-3 mt-2">Pedidos de aval</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Estas entidades te indicaron como referencia. Avalá sólo si las
          conocés de verdad: tu aval es público y sostiene su publicación.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {pedidos.map((p) => (
          <li key={p.id} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow" style={{ color: "var(--text-faint)" }}>
                  {[p.endorsed?.locality, p.endorsed?.province]
                    .filter(Boolean)
                    .join(", ") || "Sin ubicación declarada"}
                </p>
                <h3 className="heading-3 mt-1">{p.endorsed?.name}</h3>
              </div>
              <span className="badge badge-outline shrink-0">
                {relativeTime(p.created_at)}
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {p.endorsed?.description}
            </p>
            <input
              value={nota[p.id] ?? ""}
              onChange={(e) => setNota({ ...nota, [p.id]: e.target.value })}
              placeholder="De dónde la conocés (público en su perfil)"
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "var(--r-field)",
                color: "var(--text-strong)",
                padding: "10px 14px",
              }}
            />
            <div className="flex gap-2">
              <button
                className="btn btn-primary btn-sm"
                disabled={!(nota[p.id] ?? "").trim()}
                onClick={() => responder(p, true)}
              >
                Avalar
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => responder(p, false)}>
                No la conozco
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
