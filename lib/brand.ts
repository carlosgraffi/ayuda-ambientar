/**
 * El único lugar donde vive el nombre de la plataforma.
 *
 * El dominio todavía está por confirmarse en nic.ar (don.ar es de tres
 * letras y esos suelen tener restricción o subasta). Si no sale, los
 * candidatos libres son cuid.ar y recuperar comoayud.ar: cambiar de marca
 * tiene que ser editar este archivo y nada más.
 */
export const brand = {
  /** Se parte en dos para el gesto tipográfico: liviano + `.ar` en 800. */
  nameLight: "don",
  nameBold: ".ar",
  get name() {
    return `${this.nameLight}${this.nameBold}`;
  },

  tagline: "Dónde donar, con quién chequeado",

  /**
   * Qué es la plataforma, en una frase, para metadata y para el "sobre el
   * sitio". Dice explícitamente lo que NO hace, porque es la parte que
   * genera confianza: la plata nunca pasa por acá.
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
 * Instancia servida en F1. En F2 esto sale de la resolución por hostname y
 * pasa a ser un registro de tenants; hasta entonces, una constante.
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
  host: "ayudapatagonia.ar",
} as const;

export const siteUrl = `https://${instance.host}`;
