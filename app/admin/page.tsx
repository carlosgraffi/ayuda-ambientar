"use client";

import { useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { brand } from "@/lib/brand";
import { getBrowserClient } from "@/lib/admin/browser";
import { Login } from "@/components/admin/Login";
import { CampaignPanel, type CampaignFila } from "@/components/admin/CampaignPanel";
import { RequestsInbox } from "@/components/admin/RequestsInbox";

/**
 * El panel.
 *
 * Vive dentro del mismo sitio estático: no hay servidor propio, el
 * navegador habla directo con Supabase y las políticas de fila deciden qué
 * puede hacer cada quien. Es lo que permite que una instancia nueva no
 * necesite infraestructura aparte — se despliega el sitio y el panel viene
 * adentro.
 *
 * Está detrás de `noindex`: no es secreto (la seguridad está en la base),
 * pero no tiene por qué aparecer en un buscador.
 */
export default function AdminPage() {
  const [db, setDb] = useState<SupabaseClient | null>(null);
  const [listo, setListo] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [campanias, setCampanias] = useState<CampaignFila[] | null>(null);
  const [abierta, setAbierta] = useState<CampaignFila | null>(null);

  useEffect(() => {
    let vivo = true;
    getBrowserClient().then(async (cliente) => {
      if (!vivo) return;
      setDb(cliente);
      if (cliente) {
        const { data } = await cliente.auth.getSession();
        setSession(data.session);
        cliente.auth.onAuthStateChange((_e, s) => setSession(s));
      }
      setListo(true);
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!db || !session) {
      setCampanias(null);
      return;
    }
    /**
     * Sin filtro por usuario a propósito: las campañas son de lectura
     * pública, así que quien decide qué se ve acá es la membresía al
     * intentar editar. Se listan sólo aquellas donde hay membresía.
     */
    void db
      .from("memberships")
      .select(
        "tenants ( id, slug, name, year, closed_at, last_reviewed_at, results )",
      )
      .then(({ data }) => {
        const filas = (data ?? [])
          .map((m: any) => m.tenants)
          .filter(Boolean) as CampaignFila[];
        setCampanias(filas.sort((a, b) => b.year - a.year));
      });
  }, [db, session]);

  if (!listo) return <Marco />;

  if (!db)
    return (
      <Marco>
        <div className="card flex flex-col gap-2">
          <p className="eyebrow">Sin conexión a la base</p>
          <p style={{ color: "var(--text-muted)" }}>
            Este despliegue no tiene configuradas las claves de Supabase, así
            que el panel no puede funcionar. El sitio público sí: está
            sirviendo el contenido versionado en el repositorio.
          </p>
        </div>
      </Marco>
    );

  if (!session)
    return (
      <Marco>
        <Login db={db} />
      </Marco>
    );

  if (abierta)
    return (
      <Marco onSalir={() => db.auth.signOut()}>
        <CampaignPanel
          db={db}
          campaign={abierta}
          onBack={() => setAbierta(null)}
        />
      </Marco>
    );

  return (
    <Marco onSalir={() => db.auth.signOut()}>
      <div className="flex flex-col gap-6">
        <h1 className="heading-2">Campañas</h1>
        {campanias === null ? (
          <p style={{ color: "var(--text-muted)" }}>Cargando…</p>
        ) : campanias.length === 0 ? (
          <div className="card flex flex-col gap-2">
            <p className="eyebrow">Sin campañas</p>
            <p style={{ color: "var(--text-muted)" }}>
              Tu cuenta entró bien, pero todavía no es miembro de ninguna
              campaña. Pedile a quien administra la instancia que te agregue.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {campanias.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setAbierta(c)}
                  className="card card-hover flex w-full items-center justify-between gap-4 text-left"
                  style={{ padding: "16px 18px" }}
                >
                  <span>
                    <span className="block" style={{ color: "var(--text-strong)" }}>
                      {c.name} {c.year}
                    </span>
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {c.slug}
                    </span>
                  </span>
                  <span
                    className={`badge shrink-0 ${
                      c.closed_at ? "badge-outline" : "badge-accent"
                    }`}
                  >
                    {c.closed_at ? "Cerrada" : "Abierta"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Sólo aparece si hay filas, y sólo hay filas para quien
            administra la plataforma: lo decide la base, no esta pantalla. */}
        <RequestsInbox db={db} />
      </div>
    </Marco>
  );
}

function Marco({
  children,
  onSalir,
}: {
  children?: React.ReactNode;
  onSalir?: () => void;
}) {
  return (
    <main
      className="container"
      style={{ paddingBlock: "var(--sp-10)", maxWidth: 820 }}
    >
      <div className="mb-8 flex items-center justify-between gap-4">
        <a href="/" className="brand brand-sm">
          <b>{brand.productName}</b>
          <span style={{ color: "var(--text-faint)" }}>
            {brand.platformSuffix}
          </span>
        </a>
        {onSalir && (
          <button className="btn btn-ghost btn-sm" onClick={onSalir}>
            Salir
          </button>
        )}
      </div>
      {children}
    </main>
  );
}
