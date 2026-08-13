import type { NextConfig } from "next";

/**
 * F1 es un sitio estático: no hay backend todavía y todo el contenido vive en
 * `content/`. `output: "export"` emite un `out/` plano que Cloudflare Pages
 * sirve sin runtime, que es lo más barato y lo más resistente al pico de
 * tráfico de una catástrofe (Cloudflare no cobra egress).
 *
 * En F2, cuando entre la resolución de tenant por hostname, esto pasa a
 * OpenNext sobre Workers. Hasta entonces, estático.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
