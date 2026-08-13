import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
import { getTenants } from "@/lib/content";
import { canonicalUrl } from "@/lib/urls";

/** Requerido por `output: export`: se genera en el build, no por request. */
export const dynamic = "force-static";

/**
 * La portada más una entrada por instancia, cada una en su URL canónica
 * — la del dominio propio cuando lo tiene. El posicionamiento en
 * buscadores es el activo del proyecto: la gente llega buscando "cómo
 * ayudar incendios Patagonia", no por el nombre del sitio.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    {
      url: `${brand.url}/`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...(await getTenants()).map((t) => ({
      url: canonicalUrl(t),
      lastModified: new Date(t.lastReviewed),
      changeFrequency: "daily" as const,
      priority: 1,
    })),
  ];
}
