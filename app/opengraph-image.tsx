import { ImageResponse } from "next/og";
import { brand, instance } from "@/lib/brand";
import { organizations } from "@/content/patagonia/organizations";

/**
 * Requerido por `output: export`: las rutas de metadata se generan en el
 * build y no en cada request.
 */
export const dynamic = "force-static";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${instance.name} · ${brand.name}`;

const count = organizations.filter((o) => o.region === "patagonia").length;

/**
 * La tarjeta que se ve cuando alguien comparte el link por WhatsApp, que
 * es como circula de verdad este sitio. Sin webfont: `next/og` tendría que
 * descargar y embeber Bricolage, y la caída a la pila del sistema mantiene
 * la generación rápida y sin dependencias de red en el build.
 */
export default function Image() {
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
          {brand.name} · {instance.shortName}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 68, lineHeight: 1.05 }}>
            ¿Cómo ayudar a quienes atravesaron los incendios?
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#C3CDC6" }}>
            {count} organizaciones con sus datos chequeados a mano. La
            transferencia va directo a cada una.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
