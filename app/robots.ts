import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

/**
 * Requerido por `output: export`: las rutas de metadata se generan en el
 * build y no en cada request.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${brand.url}/sitemap.xml`,
  };
}
