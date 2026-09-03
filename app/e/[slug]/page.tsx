import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/lib/brand";
import { getEntities } from "@/lib/content";
import { ORG_TYPE_LABEL, URGENCY_LABEL } from "@/lib/types";
import { getRail, primaryChannel } from "@/lib/rails";
import { fullDate, relativeTime } from "@/lib/format";
import { TopBar } from "@/components/site/TopBar";
import { VerificationBadge } from "@/components/site/VerificationBadge";
import { ReportButton } from "@/components/site/ReportButton";

/**
 * El perfil público de una entidad: el directorio permanente.
 *
 * Acá vive lo que no entra en la tarjeta de campaña: los avales con su
 * contexto ("trabajamos juntos en el incendio de 2025"), el inventario de
 * necesidades completo con su frescura, y el botón de reporte. Una entidad
 * existe más allá de las campañas en las que se activó — al cerrar una, el
 * perfil sigue.
 */

export async function generateStaticParams() {
  return (await getEntities()).map((o) => ({ slug: o.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const o = (await getEntities()).find((x) => x.slug === slug);
  if (!o) return {};
  return {
    title: `${o.name} · ${ORG_TYPE_LABEL[o.type]}`,
    description: o.description,
    alternates: { canonical: `${brand.url}/e/${o.slug}/` },
  };
}

export default async function Page({ params }: Props) {
  const slug = (await params).slug;
  const org = (await getEntities()).find((o) => o.slug === slug);
  if (!org) notFound();

  const channel = primaryChannel(org.channels);
  const rail = channel ? getRail(channel.rail) : null;
  const insumos = org.needs.filter((n) => n.supplyName);
  const dinero = org.needs.filter((n) => n.kind === "dinero" && !n.supplyName);
  const ultimaNecesidad = org.needs
    .map((n) => n.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <>
      <TopBar />
      <main id="contenido" className="container section-tight">
        <div className="container-text flex flex-col gap-8">
          <header className="flex flex-col gap-3">
            <p className="eyebrow">
              {ORG_TYPE_LABEL[org.type]}
              {org.locality && ` · ${org.locality}`}
              {org.province && `, ${org.province}`}
            </p>
            <h1 className="heading-1">{org.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <VerificationBadge level={org.verificationLevel ?? 2} />
              {org.isValidator && (
                <span className="badge badge-outline">Organización validadora</span>
              )}
            </div>
            <p className="lead">{org.description}</p>
          </header>

          {/* Quién recibe la transferencia: el dato de siempre, sin cambiar. */}
          {channel && rail && (
            <section className="card flex flex-col gap-3">
              <p className="eyebrow">Para donar</p>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="metric-label" style={{ fontSize: 10 }}>
                    {rail.identifierLabel}
                  </p>
                  <p className="alias mt-1" style={{ fontSize: "1.15rem" }}>
                    {channel.identifier}
                  </p>
                </div>
                <div className="text-right">
                  <p className="metric-label" style={{ fontSize: 10 }}>
                    Titular de la cuenta
                  </p>
                  <p
                    className="mt-1 text-sm font-medium"
                    style={{
                      color:
                        org.holderStatus === "declarado"
                          ? "var(--text-strong)"
                          : "var(--text-faint)",
                    }}
                  >
                    {org.holderStatus === "declarado"
                      ? org.holderName
                      : "Sin titular declarado"}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Necesidades en vivo, con la frescura a la vista. */}
          {insumos.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="section-head" style={{ marginBottom: 0 }}>
                <p className="eyebrow">Qué necesitan</p>
                {ultimaNecesidad && (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Lo mantiene la propia entidad · actualizado{" "}
                    <time dateTime={ultimaNecesidad} title={fullDate(ultimaNecesidad)}>
                      {relativeTime(ultimaNecesidad)}
                    </time>
                  </p>
                )}
              </div>
              <ul className="flex flex-col">
                {insumos.map((n) => {
                  const cubierto = n.urgency === "cubierto";
                  return (
                    <li
                      key={n.supplyName}
                      className="flex items-baseline justify-between gap-4 py-3"
                      style={{
                        borderTop: "1px solid var(--border-hairline)",
                        opacity: cubierto ? 0.55 : 1,
                      }}
                    >
                      <div className="min-w-0">
                        <p
                          style={{
                            color: "var(--text-strong)",
                            textDecoration: cubierto ? "line-through" : "none",
                          }}
                        >
                          {n.supplyName}
                          {n.quantityNote && (
                            <span
                              className="ml-2 text-sm"
                              style={{ color: "var(--text-muted)", textDecoration: "none" }}
                            >
                              {n.quantityNote}
                            </span>
                          )}
                        </p>
                        {n.deliveryNote && (
                          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            Entrega: {n.deliveryNote}
                          </p>
                        )}
                      </div>
                      <span
                        className="badge shrink-0"
                        style={
                          n.urgency === "urgente"
                            ? { background: "var(--riesgo-5-soft)", color: "var(--riesgo-5)" }
                            : cubierto
                              ? { background: "var(--bg-sunken)", color: "var(--text-faint)" }
                              : { background: "var(--bg-sunken)", color: "var(--text-muted)" }
                        }
                      >
                        {URGENCY_LABEL[n.urgency ?? "se_necesita"]}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {dinero.length > 0 && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  También reciben aportes económicos por el alias de arriba.
                </p>
              )}
            </section>
          )}

          {/* Los avales, públicos y con contexto: son el sustento del badge. */}
          {org.endorsements && org.endorsements.length > 0 && (
            <section className="flex flex-col gap-3">
              <p className="eyebrow">Quiénes la avalan</p>
              <ul className="flex flex-col gap-2">
                {org.endorsements.map((a) => (
                  <li key={a.bySlug} className="card card-subtle flex flex-col gap-1">
                    <p style={{ color: "var(--text-strong)" }}>
                      <a href={`/e/${a.bySlug}/`}>{a.byName}</a>
                    </p>
                    {a.note && (
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        “{a.note}”
                      </p>
                    )}
                    <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                      {relativeTime(a.date)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer
            className="flex flex-col gap-3"
            style={{ borderTop: "1px solid var(--border-hairline)", paddingTop: 24 }}
          >
            {org.id && <ReportButton orgId={org.id} orgName={org.name} />}
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              <a href="/">{brand.name}</a> no recibe donaciones: las
              transferencias van directo a cada entidad.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
