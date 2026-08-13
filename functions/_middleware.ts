/**
 * Resolución de instancia por dominio propio, en el borde de Cloudflare.
 *
 * El sitio es un export estático: `/patagonia/` y `/corrientes/` son
 * archivos HTML servidos desde el CDN. Lo único que no se puede resolver
 * en el build es qué instancia va en la raíz de cada dominio propio, y de
 * eso se ocupa esta función.
 *
 *   ayudapatagonia.ar/      → sirve /patagonia/  (reescritura, no redirect:
 *                             la URL que ve la gente no cambia)
 *   ayudapatagonia.ar/algo  → 301 a la raíz de ese dominio
 *   ayuda.ambient.ar/*      → pasa de largo, sin tocar nada
 *
 * `public/_routes.json` la excluye de los assets, así que no corre para
 * imágenes, CSS ni JS: sólo para documentos.
 *
 * Esta tabla espeja `HOST_TO_SLUG` de `lib/tenants.ts`. Están separadas
 * porque esto corre en el runtime de Workers, sin el bundler de Next; en
 * F3, cuando el registro salga de la base, las dos leerán del mismo KV.
 */
const SLUG_POR_HOST: Record<string, string> = {
  // Apunta a la EDICIÓN VIGENTE. Al abrir una edición nueva hay que
  // moverlo acá, si no el dominio propio sigue sirviendo la del año
  // pasado — que además está cerrada y no invita a transferir.
  "ayudapatagonia.ar": "patagonia-2026",
  "www.ayudapatagonia.ar": "patagonia-2026",
};

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const slug = SLUG_POR_HOST[url.hostname];

  // Dominio de la plataforma o preview: las rutas ya son las correctas.
  if (!slug) return context.next();

  if (url.pathname === "/" || url.pathname === "") {
    const destino = new URL(`/${slug}/`, url);
    return context.env.ASSETS.fetch(new Request(destino, context.request));
  }

  /**
   * En un dominio propio sólo existe su instancia. Todo lo demás —
   * `/patagonia/` explícito, las rutas viejas de comoayud.ar, `/familias`
   * con sus datos de ejemplo — va a la raíz con un 301, que es lo que
   * conserva el posicionamiento de los enlaces que ya circulan.
   */
  return Response.redirect(new URL("/", url).toString(), 301);
};
