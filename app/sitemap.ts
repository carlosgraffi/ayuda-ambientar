import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/brand";
import { lastReviewed } from "@/content/patagonia/situation";

/**
 * Requerido por `output: export`: las rutas de metadata se generan en el
 * build y no en cada request.
 */
export const dynamic = "force-static";

/**
 * Una sola página por ahora. Importa igual desde el día uno: el
 * posicionamiento en buscadores es el activo del proyecto — la gente llega
 * buscando "cómo ayudar incendios Patagonia", no por el nombre del sitio.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(lastReviewed),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
