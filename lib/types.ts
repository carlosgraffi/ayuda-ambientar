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
  | "comunidad"
  | "ong"
  | "municipio"
  | "red_informal"
  | "otro";

export const ORG_TYPE_LABEL: Record<OrgType, string> = {
  bomberos: "Bomberos",
  brigada: "Brigadas",
  viandas: "Viandas y comedores",
  familias: "Familias",
  comunidad: "Comunidad",
  ong: "ONG",
  municipio: "Municipio",
  red_informal: "Red informal",
  otro: "Otra",
};

/**
 * Nivel de confianza, el corazón de la v2.
 *
 * 0 nunca se publica. 1 lo alcanza sola una entidad con avales de la
 * comunidad. 2 lo pone únicamente un moderador con checklist. El badge es
 * visible siempre: la confianza no es un gate binario sino información.
 */
export type VerificationLevel = 0 | 1 | 2;

export const VERIFICATION_LABEL: Record<VerificationLevel, string> = {
  0: "Sin verificar",
  1: "Avalada por la comunidad",
  2: "Verificación completa",
};

/** Un aval público: quién conoce a esta entidad y de dónde. */
export interface Endorsement {
  byName: string;
  bySlug: string;
  note: string | null;
  date: string;
}

export type NeedUrgency = "urgente" | "se_necesita" | "cubierto";

export const URGENCY_LABEL: Record<NeedUrgency, string> = {
  urgente: "Urgente",
  se_necesita: "Se necesita",
  cubierto: "Cubierto",
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
  /** Ítem del catálogo, cuando es un insumo concreto. */
  supplyName?: string;
  supplyUnit?: string;
  urgency?: NeedUrgency;
  quantityNote?: string;
  deliveryNote?: string;
  /** Cuándo la entidad lo tocó por última vez: la frescura es visible. */
  updatedAt?: string;
  coveredAt?: string;
}

export interface Organization {
  /** Id en la base. El contenido versionado no lo tiene. */
  id?: string;
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
  /**
   * Nivel de confianza. El contenido estático de `content/` no lo declara
   * y se normaliza a 2: esas organizaciones se verificaron a mano.
   */
  verificationLevel?: VerificationLevel;
  isValidator?: boolean;
  province?: string;
  locality?: string;
  /** Avales activos, públicos en el perfil. */
  endorsements?: Endorsement[];
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
