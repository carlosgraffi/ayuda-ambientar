import type { OrgChannel, RailId } from "./types";

/**
 * Medios de transferencia, por país.
 *
 * Esta es la pieza que hace replicable el proyecto. En el repo viejo el
 * botón de MercadoPago y el "copiar alias" ERAN la tarjeta: estaban
 * escritos directamente en el JSX, así que una instancia colombiana no
 * tenía dónde entrar.
 *
 * Regla: un rail sin deeplink no muestra un botón muerto. La tarjeta se
 * reduce a copiar y compartir, y ya. Agregar un país es agregar una
 * entrada acá, no tocar `OrgCard`.
 */

export interface RailAction {
  kind: "copy" | "deeplink";
  label: string;
  /** Sólo para `deeplink`. */
  href?: string;
  /**
   * Color de marca de un tercero. Se reproduce exacto y no se restila: en
   * un botón de donación el reconocimiento es toda la función.
   */
  brandClass?: string;
  /** Logo de la marca, cuando reemplaza al texto. */
  brandLogo?: { src: string; alt: string; width: number; height: number };
}

export interface Rail {
  id: RailId;
  countries: string[];
  /** Rótulo del identificador, tal como lo llama la gente en ese país. */
  identifierLabel: string;
  actions: (identifier: string) => RailAction[];
}

const RAILS: Record<RailId, Rail> = {
  /**
   * El alias CBU/CVU argentino. Funciona desde cualquier banco o
   * billetera; MercadoPago es sólo la más usada, por eso el deeplink.
   * Modelarlo como "alias" y no como "alias de MercadoPago" es lo que deja
   * lugar a Nequi o Pix sin rehacer nada.
   */
  alias_ar: {
    id: "alias_ar",
    countries: ["AR"],
    identifierLabel: "Alias bancario",
    actions: (identifier) => [
      { kind: "copy", label: "Copiar", href: identifier },
      {
        kind: "deeplink",
        label: "Transferir con",
        // Abre la app si está instalada; el navegador cae al sitio solo.
        href: "https://www.mercadopago.com.ar/",
        brandClass: "btn-mercadopago",
        // El SVG es 1048×425 (relación ~2.47), así que a 28px de alto
        // ocupa unos 69px de ancho y el logotipo sigue siendo legible.
        brandLogo: {
          src: "/mercadopago-handshake-white.svg",
          alt: "Mercado Pago",
          width: 69,
          height: 28,
        },
      },
    ],
  },
  cbu_ar: {
    id: "cbu_ar",
    countries: ["AR"],
    identifierLabel: "CBU",
    // Sin deeplink: se copia y se pega en el homebanking. No inventamos
    // un botón que no lleva a ningún lado.
    actions: (identifier) => [
      { kind: "copy", label: "Copiar", href: identifier },
    ],
  },
};

export function getRail(id: RailId): Rail {
  return RAILS[id];
}

/** El canal que la tarjeta muestra primero. */
export function primaryChannel(channels: OrgChannel[]): OrgChannel | undefined {
  return channels[0];
}
