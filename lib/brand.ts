/**
 * El único lugar donde vive la identidad de la plataforma.
 *
 * La plataforma es **Ayuda**, un producto del laboratorio ambient.ar, y
 * vive en `ayuda.ambient.ar`. Las instancias son rutas: `/patagonia`,
 * `/bahia-blanca`, `/cauca`.
 *
 * Por qué path y no subdominio: el SSL gratuito de Cloudflare cubre un
 * solo nivel (`*.ambient.ar`), así que `patagonia.ayuda.ambient.ar`
 * costaría un certificado aparte. Pero la razón de fondo no es el costo —
 * una instancia que quiere identidad propia no la quiere como subdominio
 * de un laboratorio argentino, la quiere como dominio propio. Eso es
 * exactamente lo que hace ayudapatagonia.ar hoy, y lo que un equipo
 * colombiano va a querer mañana. El multi-tenant de F2 resuelve dominio
 * propio por host exacto; el path es para las instancias que no tienen o
 * no quieren uno.
 */
export const brand = {
  /** El nombre del producto lleva el peso; el laboratorio, el respaldo. */
  productName: "ayuda",
  platformSuffix: ".ambient.ar",
  get name() {
    return `${this.productName}${this.platformSuffix}`;
  },
  url: "https://ayuda.ambient.ar",

  tagline: "Dónde donar, con quién chequeado",

  /**
   * Qué es la plataforma, en una frase. Dice explícitamente lo que NO
   * hace, porque es la parte que genera confianza: la plata nunca pasa
   * por acá.
   */
  description:
    "Organizaciones, brigadas y campañas que reciben donaciones ante " +
    "catástrofes, con sus datos chequeados a mano. Las transferencias van " +
    "directo a cada organización: acá no se centraliza ni un peso.",

  locale: "es-AR",
  contactEmail: "carlos@redisen.ar",

  /** Organización responsable. Aparece como respaldo en el pie. */
  parentOrg: {
    name: "Rediseñ.ar",
    url: "https://redisen.ar",
    lab: "ambient.ar",
    labUrl: "https://ambient.ar",
  },
} as const;

/**
 * Instancia servida en F1. En F2 esto sale de la resolución por hostname
 * o por el primer segmento del path; hasta entonces, una constante.
 */
export const instance = {
  slug: "patagonia",
  name: "Incendios en la Patagonia",
  shortName: "Patagonia",
  /** Selecciona la paleta funcional vía `data-disaster`. Ver globals.css. */
  disasterType: "fuego" as const,
  countryCode: "AR",
  /** activa | contencion | recuperacion | latente */
  emergencyStatus: "recuperacion" as const,

  /**
   * El dominio propio de esta instancia. Sigue siendo el canónico para
   * buscadores: es donde está el posicionamiento acumulado y los enlaces
   * que ya circulan. `ayuda.ambient.ar/patagonia` sirve el mismo
   * contenido y apunta acá.
   */
  host: "ayudapatagonia.ar",
  path: "/patagonia",
} as const;

export const siteUrl = `https://${instance.host}`;
