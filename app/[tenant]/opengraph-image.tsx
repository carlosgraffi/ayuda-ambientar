import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { TENANTS, getTenant } from "@/lib/tenants";

/** Requerido por `output: export`: se genera en el build, no por request. */
export const dynamic = "force-static";

export function generateStaticParams() {
  return TENANTS.map((t) => ({ tenant: t.slug }));
}

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = brand.name;

/**
 * La tarjeta que se ve cuando alguien comparte el link por WhatsApp, que
 * es como circula de verdad este sitio.
 *
 * Sin webfont a propósito: `next/og` tendría que descargar y embeber
 * Bricolage en cada generación, y la pila del sistema mantiene el build
 * rápido y sin depender de la red.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const tenant = getTenant((await params).tenant);
  const titulo = tenant
    ? tenant.headline.replace(/\*\*/g, "")
    : "¿Cómo ayudar ante una catástrofe?";
  const cantidad = tenant?.organizations.length ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0D1712",
          color: "#F6F8F6",
          padding: 72,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#97A59C",
          }}
        >
          {brand.name}
          {tenant ? ` · ${tenant.shortName}` : ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 68, lineHeight: 1.05 }}>
            {titulo}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#C3CDC6" }}>
            {cantidad} organizaciones con sus datos chequeados a mano. La
            transferencia va directo a cada una.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
