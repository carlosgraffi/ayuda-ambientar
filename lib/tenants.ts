import type { Campaign, Hotspot, Organization } from "./types";
import { organizations as orgsPatagonia } from "@/content/patagonia/organizations";
import {
  campaigns as campPatagonia,
  hotspots as hotPatagonia,
  lastReviewed as revPatagonia,
} from "@/content/patagonia/situation";
import { organizations as orgsCorrientes } from "@/content/corrientes/organizations";
import { lastReviewed as revCorrientes } from "@/content/corrientes/situation";
import regions from "@/content/regions.json";

/**
 * Registro de instancias.
 *
 * Una instancia es UNA CAMPAÑA: una catástrofe en un año. Los incendios de
 * la Patagonia de 2025 y los de 2026 son campañas distintas aunque hoy
 * listen las mismas organizaciones — se relevaron en momentos distintos,
 * se cierran por separado y cada una tiene sus propios resultados.
 *
 * `campaign` agrupa las ediciones de un mismo territorio para poder
 * enlazarlas entre sí. Todas se sirven desde un mismo deploy en
 * `ayuda.ambient.ar/<slug>`, y las que tienen dominio propio lo declaran
 * en `hosts`.
 *
 * En F3 esto sale de la base. Hasta entonces vive versionado acá, que para
 * tres campañas es más fácil de auditar que una tabla.
 *
 * Lo que una instancia NO elige es la paleta: elige `disasterType`, y de
 * ahí salen los colores (ver §COLOR FUNCIONAL en globals.css).
 */

export type DisasterType = "fuego" | "agua" | "viento";

/**
 * Cómo se nombra la situación según el desastre. Es poco texto, pero es
 * exactamente la clase de cosa que estaba escrita a mano en el JSX y que
 * hacía que una segunda catástrofe empezara con un archivo copiado.
 */
export const SITUATION_HEADING: Record<DisasterType, string> = {
  fuego: "Dónde llegó el fuego",
  agua: "Hasta dónde llegó el agua",
  viento: "Dónde golpeó el viento",
};

/**
 * En qué momento está la emergencia. No es decorativo: decide qué muestra
 * la página primero. En `latente` el foco pasa de "dónde donar ahora" a
 * prevención y colaboración durante el año, que es lo que hace que el
 * sitio sirva los once meses restantes. Ese modo llega en F5.
 */
export type EmergencyStatus =
  | "activa"
  | "contencion"
  | "recuperacion"
  | "latente";

/**
 * Lo que efectivamente se midió de una campaña.
 *
 * Todo es opcional a propósito, y la pantalla de resultados distingue
 * entre "cero" y "no se midió". Son cosas distintas: cero visitas es un
 * resultado, no haberlas medido es una laguna nuestra, y presentarlas
 * igual vuelve el resumen ilegible.
 */
export interface CampaignResults {
  /** Visitas durante la campaña. */
  visits?: number;
  /** Cuánta gente copió un alias. */
  aliasCopies?: number;
  /** Cuánta gente abrió la app de transferencia. */
  transferClicks?: number;
  /** Veces que se compartió una organización. */
  shares?: number;
  /**
   * Qué NO se midió y por qué. Se muestra tal cual: una campaña sin
   * métricas es un dato sobre nosotros, no sobre la campaña.
   */
  notMeasured?: string;
}

export interface Tenant {
  slug: string;
  /** Agrupa las ediciones de un mismo territorio. */
  campaign: string;
  name: string;
  shortName: string;
  /** Titular de la página. Lo que va entre ** se compone en 800. */
  headline: string;
  lead: string;
  disasterType: DisasterType;
  emergencyStatus: EmergencyStatus;
  /** Año de la campaña. Distingue una edición de otra. */
  year: number;
  countryCode: string;
  /** Dominios propios. El primero es el canónico. Vacío = sólo por path. */
  hosts: string[];
  hero?: { src: string; width: number; height: number };
  lastReviewed: string;
  /**
   * Cuándo se cerró la campaña. Presente = cerrada: la página deja de
   * invitar a transferir, porque mandar plata a una colecta terminada no
   * ayuda a nadie y erosiona lo único que este sitio tiene para ofrecer.
   */
  closedAt?: string;
  results?: CampaignResults;
  organizations: Organization[];
  hotspots: Hotspot[];
  campaigns: Campaign[];
}

export const TENANTS: Tenant[] = [
  {
    slug: "patagonia-2026",
    campaign: "patagonia",
    name: "Incendios en la Patagonia",
    shortName: "Patagonia",
    headline: "¿Cómo **ayudar** a quienes atravesaron los incendios?",
    lead: "Bomberos, brigadas, comedores y colectas de la Comarca Andina, relevados uno por uno.",
    disasterType: "fuego",
    emergencyStatus: "recuperacion",
    year: 2026,
    countryCode: "AR",
    hosts: ["ayudapatagonia.ar", "www.ayudapatagonia.ar"],
    hero: { src: "/portada.jpg", width: 1200, height: 400 },
    lastReviewed: revPatagonia,
    // Hoy lista las mismas organizaciones que 2025: es la misma red, y no
    // se inventa un relevamiento nuevo que no se hizo.
    organizations: orgsPatagonia,
    hotspots: [],
    campaigns: campPatagonia,
  },
  {
    slug: "patagonia-2025",
    campaign: "patagonia",
    name: "Incendios en la Patagonia",
    shortName: "Patagonia",
    headline: "¿Cómo **ayudar** a quienes atravesaron los incendios?",
    lead: "Bomberos, brigadas, comedores y colectas de la Comarca Andina, relevados uno por uno.",
    disasterType: "fuego",
    emergencyStatus: "recuperacion",
    year: 2025,
    countryCode: "AR",
    hosts: [],
    hero: { src: "/portada.jpg", width: 1200, height: 400 },
    lastReviewed: revPatagonia,
    closedAt: "2025-12-31T00:00:00-03:00",
    results: {
      /**
       * El sitio contaba copias y transferencias en Firestore, pero la
       * colección tiene 15 eventos de un solo día, el 5/2/2025 — el día
       * que se instrumentó. Después no registró nada más, durante una
       * campaña que sí tuvo alcance. Esos números no describen lo que
       * pasó, así que no se publican: se dice la laguna.
       */
      notMeasured:
        "Esta campaña no tuvo medición de tráfico. El contador de copias y transferencias registró un solo día y después dejó de funcionar, así que no hay números que describan honestamente su alcance.",
    },
    organizations: orgsPatagonia,
    hotspots: hotPatagonia,
    campaigns: campPatagonia,
  },
  {
    slug: "corrientes-2025",
    campaign: "corrientes",
    name: "Incendios en Corrientes",
    shortName: "Corrientes",
    headline: "¿Cómo **ayudar** con los incendios en Corrientes?",
    lead: "Bomberos voluntarios y organizaciones que trabajan sobre los incendios en la provincia.",
    disasterType: "fuego",
    emergencyStatus: "recuperacion",
    year: 2025,
    countryCode: "AR",
    hosts: [],
    lastReviewed: revCorrientes,
    closedAt: "2025-12-31T00:00:00-03:00",
    results: {
      notMeasured:
        "Esta campaña no tuvo medición de tráfico: el sitio todavía no registraba visitas ni interacciones.",
    },
    organizations: orgsCorrientes,
    hotspots: [],
    campaigns: [],
  },
];

/** Una campaña cerrada ya no recibe donaciones a través del sitio. */
export function estaCerrada(t: Tenant): boolean {
  return Boolean(t.closedAt);
}

/** Si la emergencia sigue ocurriendo. Decide cómo se agrupa la portada. */
export function enCurso(t: Tenant): boolean {
  if (estaCerrada(t)) return false;
  return t.emergencyStatus === "activa" || t.emergencyStatus === "contencion";
}

/**
 * El recuadro que consulta el mapa de focos, indexado por campaña. Vive en un JSON
 * y no acá porque `scripts/fetch-focos.mjs` corre en Node durante el build
 * y necesita leer la misma lista: una sola fuente de verdad, en el único
 * formato que las dos pueden leer.
 */
export const REGION_BBOX = regions as Record<string, number[]>;

export function getTenant(slug: string): Tenant | undefined {
  return TENANTS.find((t) => t.slug === slug);
}

/** La edición vigente de una campaña, si hay alguna abierta. */
export function edicionVigente(campaign: string): Tenant | undefined {
  return TENANTS.filter((t) => t.campaign === campaign && !estaCerrada(t)).sort(
    (a, b) => b.year - a.year,
  )[0];
}

/** Las ediciones anteriores de la misma campaña, de más nueva a más vieja. */
export function edicionesAnteriores(t: Tenant): Tenant[] {
  return TENANTS.filter(
    (o) => o.campaign === t.campaign && o.slug !== t.slug && o.year < t.year,
  ).sort((a, b) => b.year - a.year);
}

/**
 * Para la portada: primero lo que está ocurriendo, después lo abierto, y
 * al final lo cerrado. Dentro de cada grupo, lo más reciente arriba.
 */
export function sortedTenants(): Tenant[] {
  return [...TENANTS].sort(
    (a, b) =>
      Number(enCurso(b)) - Number(enCurso(a)) ||
      Number(estaCerrada(a)) - Number(estaCerrada(b)) ||
      b.year - a.year,
  );
}

/** Mapa host → instancia, para resolver el dominio propio en el borde. */
export const HOST_TO_SLUG: Record<string, string> = Object.fromEntries(
  TENANTS.flatMap((t) => t.hosts.map((h) => [h, t.slug])),
);
