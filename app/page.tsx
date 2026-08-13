import type { Metadata } from "next";
import { ArrowRight, Droplet, Flame, Wind } from "lucide-react";
import { brand } from "@/lib/brand";
import { TENANTS, type DisasterType, type Tenant } from "@/lib/tenants";
import { instancePath } from "@/lib/urls";
import { num, relativeTime } from "@/lib/format";
import { TopBar } from "@/components/site/TopBar";

/**
 * La portada de la plataforma: qué emergencias hay relevadas y cuántas
 * organizaciones tiene cada una.
 *
 * Vive en `ayuda.ambient.ar`. En un dominio propio como ayudapatagonia.ar
 * esta ruta no se ve nunca: el borde reescribe `/` a su instancia (ver
 * `functions/_middleware.ts`).
 */

export const metadata: Metadata = {
  title: `${brand.name} · ¿Cómo ayudar ante una catástrofe?`,
  description: brand.description,
  alternates: { canonical: `${brand.url}/` },
};

const ICONO: Record<DisasterType, typeof Flame> = {
  fuego: Flame,
  agua: Droplet,
  viento: Wind,
};

const ESTADO: Record<Tenant["emergencyStatus"], string> = {
  activa: "Emergencia activa",
  contencion: "En contención",
  recuperacion: "En recuperación",
  latente: "Sin emergencia activa",
};

export default function Page() {
  return (
    <>
      <TopBar />

      <main id="contenido">
        <section className="container section-tight">
          <p className="eyebrow">{brand.tagline}</p>
          <h1 className="display-1 mt-4 max-w-[16ch]">
            ¿Cómo <b>ayudar</b> ante una catástrofe?
          </h1>
          <p className="lead mt-5">{brand.description}</p>
        </section>

        <section className="section-subtle">
          <div className="container section-tight">
            <div className="section-head">
              <p className="eyebrow">Emergencias relevadas</p>
            </div>

            <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              {TENANTS.map((t) => {
                const Icono = ICONO[t.disasterType];
                return (
                  <li
                    key={t.slug}
                    data-disaster={t.disasterType}
                    className="card card-hover flex h-full flex-col gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Icono
                          size={24}
                          strokeWidth={1.75}
                          aria-hidden
                          style={{ color: "var(--accent-600)", marginTop: 2 }}
                        />
                        <h2 className="heading-3">{t.name}</h2>
                      </div>
                      <span className="badge badge-neutral shrink-0">
                        {ESTADO[t.emergencyStatus]}
                      </span>
                    </div>

                    <div className="metric metric-md">
                      <p className="metric-label">Organizaciones</p>
                      <p className="metric-value">{num(t.organizations.length)}</p>
                      <p className="metric-sub">
                        con sus datos chequeados a mano, revisados{" "}
                        {relativeTime(t.lastReviewed)}
                      </p>
                    </div>

                    <p className="grow" style={{ color: "var(--text-muted)" }}>
                      {t.lead}
                    </p>

                    <a
                      href={instancePath(t)}
                      className="btn btn-primary btn-md self-start"
                    >
                      Ver cómo ayudar
                      <ArrowRight size={17} strokeWidth={1.75} aria-hidden />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="container section-tight">
          <div className="container-text flex flex-col gap-4">
            <p className="eyebrow">Sobre esto</p>
            <h2 className="heading-2">
              No centralizamos donaciones. Centralizamos <b>a quién donar</b>.
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              Ante una catástrofe, la única forma de juntar fondos suele ser
              compartir alias de transferencia por historias de Instagram.
              Eso se pierde en un día, no se puede verificar y abre la puerta
              al fraude. Acá están todos juntos, con el titular de cada
              cuenta a la vista — y la transferencia va directo a la
              organización, sin pasar por ningún lado.
            </p>
            <p style={{ color: "var(--text-muted)" }}>
              Si estás organizando la respuesta a una catástrofe y te sirve
              una instancia,{" "}
              <a href={`mailto:${brand.contactEmail}?subject=Solicitar una instancia`}>
                escribinos
              </a>
              .
            </p>
          </div>
        </section>

        <footer className="section-subtle">
          <div
            className="container flex flex-col gap-4"
            style={{ paddingBlock: "var(--sp-12)" }}
          >
            <p className="brand brand-sm">
              <b>{brand.productName}</b>
              <span style={{ color: "var(--text-faint)" }}>
                {brand.platformSuffix}
              </span>
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Un proyecto de{" "}
              <a href={brand.parentOrg.url} target="_blank" rel="noopener noreferrer">
                {brand.parentOrg.name}
              </a>{" "}
              en el laboratorio{" "}
              <a href={brand.parentOrg.labUrl} target="_blank" rel="noopener noreferrer">
                {brand.parentOrg.lab}
              </a>{" "}
              · <a href={`mailto:${brand.contactEmail}`}>{brand.contactEmail}</a>
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
