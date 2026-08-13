/**
 * Modelo de contenido de don.ar.
 *
 * Reemplaza al `Organization` del repo viejo, que tenía cuatro problemas
 * estructurales:
 *
 * 1. La clasificación de qué hace cada organización estaba escrita DENTRO
 *    de la descripción ("Viandas y acopio de productos para lxs
 *    combatientxs"), así que no podía filtrar. Ahora es `type`.
 * 2. `Titular: null` dejaba un hueco en la tarjeta. Ahora `holderStatus` lo
 *    dice en voz alta: es el campo más sensible contra el fraude y callarlo
 *    es peor que no tenerlo.
 * 3. El campo `Instagram` aceptaba cualquier URL — una organización tenía
 *    ahí un link a una nota de prensa. Ahora los enlaces son tipados.
 * 4. El alias era un string suelto, atado a MercadoPago y por lo tanto a
 *    Argentina. Ahora es un canal con su rail, que es lo que permite que
 *    una instancia colombiana use Nequi.
 *
 * En F3 esto pasa a ser el esquema de Postgres casi tal cual.
 */

/** Qué hace la organización. Es lo que hace elegible a una lista de 25. */
export type OrgType =
  | "bomberos"
  | "brigada"
  | "viandas"
  | "familias"
  | "comunidad";

export const ORG_TYPE_LABEL: Record<OrgType, string> = {
  bomberos: "Bomberos",
  brigada: "Brigadas",
  viandas: "Viandas y acopio",
  familias: "Familias",
  comunidad: "Comunidad",
};

/**
 * Quién recibe la transferencia. `no_declarado` es un estado válido y se
 * muestra: la regla de "sin señal" aplicada al dato que más importa.
 */
export type HolderStatus = "declarado" | "no_declarado" | "en_verificacion";

/**
 * Medio de transferencia. `alias_ar` es el alias CBU/CVU argentino: sirve
 * desde cualquier banco o billetera, y MercadoPago es sólo la más usada.
 * Modelarlo así —y no como "alias de MercadoPago"— es lo que deja lugar a
 * `nequi`, `bancolombia` o `pix` sin tocar la tarjeta.
 */
export type RailId = "alias_ar" | "cbu_ar";

export type OrgLinkKind =
  | "instagram"
  | "facebook"
  | "web"
  | "prensa"
  | "whatsapp"
  | "email";

export interface OrgLink {
  kind: OrgLinkKind;
  url: string;
  /** El handle tal como se muestra, cuando aplica. */
  handle?: string;
  /**
   * Aclaración cuando el enlace no es de la organización — varias colectas
   * se difunden desde la cuenta de una persona, y decir de quién es evita
   * que parezca el perfil oficial.
   */
  label?: string;
}

export interface OrgChannel {
  rail: RailId;
  identifier: string;
  /** Titular de esta cuenta, si difiere del de la organización. */
  holderOverride?: string;
}

/** Formas de colaborar que no son plata. */
export type NeedKind = "dinero" | "insumos" | "voluntariado" | "difusion";

export interface OrgNeed {
  kind: NeedKind;
  detail?: string;
  /** Si sigue vigente fuera de la emergencia. Alimenta /como-colaborar. */
  recurring?: boolean;
}

export interface Organization {
  slug: string;
  name: string;
  type: OrgType;
  description: string;
  holderName: string | null;
  holderStatus: HolderStatus;
  channels: OrgChannel[];
  links: OrgLink[];
  needs: OrgNeed[];
  /** Se muestra primero. En el repo viejo se llamaba `critical`. */
  urgent: boolean;
  region: string;
}

/** Un foco o zona afectada. Reemplaza a las 7 cajas escritas en el JSX. */
export type HotspotStatus = "activo" | "contenido" | "extinguido";

export const HOTSPOT_STATUS_LABEL: Record<HotspotStatus, string> = {
  activo: "Activo",
  contenido: "Contenido",
  extinguido: "Extinguido",
};

export interface Hotspot {
  name: string;
  status: HotspotStatus;
  /** Hectáreas afectadas. `null` es "no reportado", nunca cero. */
  hectares: number | null;
}

/**
 * Campaña o enlace externo destacado. Reemplaza a los seis banners que
 * tenían seis colores arbitrarios: el tono es un token, no un color libre.
 */
export interface Campaign {
  title: string;
  organization: string;
  description: string;
  url: string;
  cta: string;
  tone: "informativo" | "urgente";
}
