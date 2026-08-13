import Image from "next/image";
import { brand, instance } from "@/lib/brand";
import { organizations } from "@/content/patagonia/organizations";
import { campaigns, hotspots, lastReviewed } from "@/content/patagonia/situation";
import { TopBar } from "@/components/site/TopBar";
import { HotspotList } from "@/components/site/HotspotList";
import { OrgList } from "@/components/site/OrgList";
import { CampaignList } from "@/components/site/CampaignList";
import { Disclaimer } from "@/components/site/Disclaimer";
import { FiresMapPanel } from "@/components/site/FiresMapPanel";
import { fullDate, relativeTime } from "@/lib/format";

/**
 * La página de la instancia Patagonia.
 *
 * En el repo viejo esto era `FireBrigadesApp.tsx`, 55 KB en un solo archivo
 * que hacía búsqueda, filtros, lista de organizaciones, mapa, modales y la
 * interfaz de donación, con los focos y las hectáreas escritos a mano
 * dentro del JSX.
 *
 * Dos arreglos de estructura que venían de ahí:
 * · Había un SEGUNDO `<h1>` a mitad de página ("¿Cómo Ayudar?"), después
 *   de varios h2 y h3. El documento tenía dos títulos y los lectores de
 *   pantalla lo anunciaban así.
 * · La estadística de Corrientes ("100.000+ hectáreas") estaba en la
 *   página de Patagonia, con el mismo peso visual que la de Patagonia.
 *   Corrientes es otra región: sus organizaciones están en la lista, pero
 *   su superficie afectada no es un titular de esta página.
 */

const patagonia = organizations.filter((o) => o.region === "patagonia");

export default function Page() {
  return (
    <>
      <TopBar lastReviewed={lastReviewed} />

      <main id="contenido">
        {/* El único lugar donde la página se compromete con una imagen, y
            funciona: foto bajo un degradado real, con texto blanco encima.
            No lleva vidrio: no hay nada detrás que desenfocar. */}
        <section className="container" style={{ paddingTop: "var(--sp-6)" }}>
          <div className="relative overflow-hidden rounded-[var(--r-card)]">
            <Image
              src="/portada.jpg"
              alt=""
              width={1200}
              height={400}
              priority
              className="h-72 w-full object-cover md:h-80"
            />
            {/* El degradado no es decoración: es lo que garantiza el
                contraste del titular sobre una foto de fuego, que es clara
                y muy contrastada. En móvil el texto ocupa más alto, así
                que el velo tiene que subir más. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(7,16,12,.94) 10%, rgba(7,16,12,.72) 55%, rgba(7,16,12,.3) 100%)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
              <p className="eyebrow" style={{ color: "rgba(255,255,255,.72)" }}>
                Información chequeada a mano · Patagonia
              </p>
              <h1
                className="display-2 mt-3 max-w-[18ch]"
                style={{ color: "#fff" }}
              >
                ¿Cómo <b>ayudar</b> a quienes atravesaron los incendios?
              </h1>
            </div>
          </div>
        </section>

        <section className="container section-tight">
          <div className="section-head">
            <p className="eyebrow">Situación</p>
            <h2 className="heading-2">Dónde llegó el fuego</h2>
            <p className="lead">
              Los focos de la temporada 2025 en la Patagonia, ordenados por
              superficie afectada. Último relevamiento{" "}
              <time dateTime={lastReviewed} title={fullDate(lastReviewed)}>
                {relativeTime(lastReviewed)}
              </time>
              .
            </p>
          </div>

          <div className="mb-10">
            <FiresMapPanel />
          </div>

          <HotspotList hotspots={hotspots} />
        </section>

        <section className="section-subtle">
          <div className="container section-tight">
            <div className="section-head">
              <p className="eyebrow">Cómo ayudar</p>
              <h2 className="heading-2">
                Organizaciones que reciben donaciones
              </h2>
              <p className="lead">
                Bomberos, brigadas, comedores y colectas relevados uno por uno.
                Cada tarjeta muestra qué hacen y quién recibe la transferencia,
                antes de pedirte nada.
              </p>
            </div>

            <div className="mb-6">
              <Disclaimer />
            </div>

            <OrgList organizations={patagonia} />
          </div>
        </section>

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
              ·{" "}
              <a href={`mailto:${brand.contactEmail}`}>{brand.contactEmail}</a>
            </p>
            <p className="eyebrow" style={{ color: "var(--text-faint)" }}>
              {instance.shortName} · Revisado{" "}
              <time dateTime={lastReviewed}>{relativeTime(lastReviewed)}</time>
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
