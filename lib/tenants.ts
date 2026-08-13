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
 * Cada catástrofe es una instancia. Todas se sirven desde un mismo deploy
 * en `ayuda.ambient.ar/<slug>`, y las que tienen dominio propio lo
 * declaran en `hosts`: `ayudapatagonia.ar` sirve la instancia de Patagonia
 * en su raíz, y esa sigue siendo su URL canónica.
 *
 * En F3 esto sale de la base y el registro pasa a ser un JSON en el borde.
 * Hasta entonces vive versionado acá, que para dos instancias es más fácil
 * de auditar que una tabla.
 *
 * Lo que una instancia NO elige es la paleta: elige `disasterType`, y de
 * ahí salen los colores (ver §COLOR FUNCIONAL en globals.css). Es lo que
 * evita que la décima instancia invente su propio naranja.
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

/** Si la emergencia sigue ocurriendo. Decide cómo se agrupa la portada. */
export function enCurso(t: Tenant): boolean {
  return t.emergencyStatus === "activa" || t.emergencyStatus === "contencion";
}

export interface Tenant {
  slug: string;
  name: string;
  shortName: string;
  /** Titular de la página. Lo que va entre ** se compone en 800. */
  headline: string;
  lead: string;
  disasterType: DisasterType;
  emergencyStatus: EmergencyStatus;
  /**
   * Año de la emergencia. Sin esto, una instancia de 2025 y una de este
   * año se ven igual, y alguien puede terminar donando a una colecta que
   * cerró hace meses creyendo que está ayudando ahora.
   */
  year: number;
  countryCode: string;
  /** Dominios propios. El primero es el canónico. Vacío = sólo por path. */
  hosts: string[];
  hero?: { src: string; width: number; height: number };
  lastReviewed: string;
  organizations: Organization[];
  hotspots: Hotspot[];
  campaigns: Campaign[];
}

export const TENANTS: Tenant[] = [
  {
    slug: "patagonia",
    name: "Incendios en la Patagonia",
    shortName: "Patagonia",
    headline: "¿Cómo **ayudar** a quienes atravesaron los incendios?",
    lead: "Bomberos, brigadas, comedores y colectas de la Comarca Andina, relevados uno por uno.",
    disasterType: "fuego",
    emergencyStatus: "recuperacion",
    year: 2025,
    countryCode: "AR",
    hosts: ["ayudapatagonia.ar", "www.ayudapatagonia.ar"],
    hero: { src: "/portada.jpg", width: 1200, height: 400 },
    lastReviewed: revPatagonia,
    organizations: orgsPatagonia,
    hotspots: hotPatagonia,
    campaigns: campPatagonia,
  },
  {
    slug: "corrientes",
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
    organizations: orgsCorrientes,
    hotspots: [],
    campaigns: [],
  },
];

/**
 * El recuadro que consulta el mapa de focos, por instancia. Vive en un
 * JSON y no acá porque `scripts/fetch-focos.mjs` corre en Node durante el
 * build y necesita leer la misma lista: una sola fuente de verdad, en el
 * único formato que las dos pueden leer.
 */
export const REGION_BBOX = regions as Record<string, number[]>;

export function getTenant(slug: string): Tenant | undefined {
  return TENANTS.find((t) => t.slug === slug);
}

/**
 * Las que están ocurriendo primero, y dentro de cada grupo las más
 * recientes. Es el orden en que alguien que llega a donar las necesita.
 */
export function sortedTenants(): Tenant[] {
  return [...TENANTS].sort(
    (a, b) => Number(enCurso(b)) - Number(enCurso(a)) || b.year - a.year,
  );
}

/** Mapa host → instancia, para resolver el dominio propio en el borde. */
export const HOST_TO_SLUG: Record<string, string> = Object.fromEntries(
  TENANTS.flatMap((t) => t.hosts.map((h) => [h, t.slug])),
);
