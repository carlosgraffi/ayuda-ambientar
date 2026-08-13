import Image from "next/image";
import { brand } from "@/lib/brand";
import { REGION_BBOX, SITUATION_HEADING, type Tenant } from "@/lib/tenants";
import { fullDate, relativeTime } from "@/lib/format";
import { TopBar } from "./TopBar";
import { HotspotList } from "./HotspotList";
import { OrgList } from "./OrgList";
import { CampaignList } from "./CampaignList";
import { Disclaimer } from "./Disclaimer";
import { FiresMapPanel } from "./FiresMapPanel";

/**
 * La página de una instancia. La misma para todas: lo que cambia son los
 * datos y `data-disaster`, que selecciona la paleta funcional.
 *
 * Antes esto era `FireBrigadesApp.tsx`, 55 KB en un solo archivo con los
 * focos, las hectáreas y los textos escritos a mano dentro del JSX — o sea
 * que una segunda catástrofe significaba copiar el archivo entero.
 */

/** El gesto de la marca: titular liviano con UNA palabra en 800. */
function Headline({ text }: { text: string }) {
  const partes = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {partes.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p))}
    </>
  );
}

export function InstancePage({ tenant }: { tenant: Tenant }) {
  const {
    headline,
    lead,
    hero,
    hotspots,
    campaigns,
    organizations,
    lastReviewed,
    shortName,
  } = tenant;

  return (
    // El tipo de desastre vive acá y no en <html>: es lo que permite que
    // un mismo deploy sirva una instancia de fuego y una de agua.
    <div data-disaster={tenant.disasterType}>
      <TopBar lastReviewed={lastReviewed} />

      <main id="contenido">
        <section className="container" style={{ paddingTop: "var(--sp-6)" }}>
          {hero ? (
            /* Cuando hay foto, la página se compromete con ella: degradado
               real y texto blanco encima. Sin vidrio — no hay nada detrás
               que desenfocar. */
            <div className="relative overflow-hidden rounded-[var(--r-card)]">
              <Image
                src={hero.src}
                alt=""
                width={hero.width}
                height={hero.height}
                priority
                className="h-72 w-full object-cover md:h-80"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(7,16,12,.94) 10%, rgba(7,16,12,.72) 55%, rgba(7,16,12,.3) 100%)",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
                <p className="eyebrow" style={{ color: "rgba(255,255,255,.72)" }}>
                  Información chequeada a mano · {shortName}
                </p>
                <h1 className="display-2 mt-3 max-w-[18ch]" style={{ color: "#fff" }}>
                  <Headline text={headline} />
                </h1>
              </div>
            </div>
          ) : (
            /* Sin foto, héroe tipográfico. No se inventa una imagen de
               archivo para una catástrofe. */
            <div className="py-8">
              <p className="eyebrow">
                Información chequeada a mano · {shortName}
              </p>
              <h1 className="display-2 mt-3 max-w-[18ch]">
                <Headline text={headline} />
              </h1>
            </div>
          )}
        </section>

        <section className="container section-tight">
          <div className="section-head">
            <p className="eyebrow">Situación</p>
            <h2 className="heading-2">
              {SITUATION_HEADING[tenant.disasterType]}
            </h2>
            <p className="lead">
              {lead} Último relevamiento{" "}
              <time dateTime={lastReviewed} title={fullDate(lastReviewed)}>
                {relativeTime(lastReviewed)}
              </time>
              .
            </p>
          </div>

          <div className={hotspots.length ? "mb-10" : ""}>
            <FiresMapPanel slug={tenant.slug} bbox={REGION_BBOX[tenant.slug]} />
          </div>

          {hotspots.length > 0 && <HotspotList hotspots={hotspots} />}
        </section>

        <section className="section-subtle">
          <div className="container section-tight">
            <div className="section-head">
              <p className="eyebrow">Cómo ayudar</p>
              <h2 className="heading-2">Organizaciones que reciben donaciones</h2>
              <p className="lead">
                Cada tarjeta muestra qué hacen y quién recibe la
                transferencia, antes de pedirte nada.
              </p>
            </div>

            <div className="mb-6">
              <Disclaimer />
            </div>

            <OrgList organizations={organizations} />
          </div>
        </section>

        {campaigns.length > 0 && (
          <section className="container section-tight">
            <div className="section-head">
              <p className="eyebrow">También podés</p>
              <h2 className="heading-2">Campañas y fuentes</h2>
              <p className="lead">
                Colectas de otras plataformas y repositorios que siguen la
                situación de cerca.
              </p>
            </div>
            <CampaignList campaigns={campaigns} />
          </section>
        )}

        <footer className="section-subtle">
          <div
            className="container flex flex-col gap-4"
            style={{ paddingBlock: "var(--sp-12)" }}
          >
            <a className="brand brand-sm" href={brand.url}>
              <b>{brand.productName}</b>
              <span style={{ color: "var(--text-faint)" }}>
                {brand.platformSuffix}
              </span>
            </a>
            <p className="max-w-[60ch] text-sm" style={{ color: "var(--text-muted)" }}>
              {brand.description}
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Un proyecto de{" "}
              <a href={brand.parentOrg.url} target="_blank" rel="noopener noreferrer">
                {brand.parentOrg.name}
              </a>{" "}
              · <a href={`mailto:${brand.contactEmail}`}>{brand.contactEmail}</a>
            </p>
            <p className="eyebrow" style={{ color: "var(--text-faint)" }}>
              {shortName} · Revisado{" "}
              <time dateTime={lastReviewed}>{relativeTime(lastReviewed)}</time>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
