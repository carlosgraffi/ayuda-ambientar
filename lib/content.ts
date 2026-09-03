import { TENANTS as TENANTS_LOCAL, type Tenant } from "./tenants";
import type { Organization, OrgLink, OrgNeed } from "./types";
import { buildClient } from "./supabase";

/**
 * De dónde sale el contenido en el build.
 *
 * Con credenciales de Supabase, de la base. Sin ellas, de `content/`, que
 * es lo que está versionado en el repo. **El build nunca falla por la
 * base**: si no responde, se usa el contenido local y se avisa en el log.
 *
 * Esto no es un puente temporal hasta terminar la migración. Es la forma
 * definitiva: el contenido versionado es el respaldo que hace que se pueda
 * desplegar el sitio aunque Supabase esté caído, que en una emergencia es
 * exactamente cuando no se puede depender de un tercero.
 */

/** Sólo lo verificado o pausado sale a la web. Un borrador no se publica. */
const ESTADOS_PUBLICOS = ["verificada", "pausada"];

type FilaOrg = {
  id: string;
  slug: string;
  name: string;
  type: Organization["type"];
  description: string;
  holder_name: string | null;
  holder_status: Organization["holderStatus"];
  urgent: boolean;
  verification_level: 0 | 1 | 2;
  is_validator: boolean;
  province: string | null;
  locality: string | null;
  org_channels: { rail: string; identifier: string; position: number }[];
  org_links: OrgLink[];
  org_needs: {
    kind: OrgNeed["kind"];
    detail: string | null;
    recurring: boolean;
    urgency: OrgNeed["urgency"];
    quantity_note: string | null;
    delivery_note: string | null;
    updated_at: string;
    covered_at: string | null;
    supply: { name: string; unit: string | null } | null;
  }[];
  avales: {
    status: string;
    context_note: string | null;
    created_at: string;
    endorser: { name: string; slug: string } | null;
  }[];
};

function aOrganizacion(f: FilaOrg): Organization {
  return {
    id: f.id,
    slug: f.slug,
    name: f.name,
    type: f.type,
    description: f.description,
    holderName: f.holder_name,
    holderStatus: f.holder_status,
    urgent: f.urgent,
    verificationLevel: f.verification_level,
    isValidator: f.is_validator,
    province: f.province ?? undefined,
    locality: f.locality ?? undefined,
    channels: [...f.org_channels]
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ rail: c.rail as never, identifier: c.identifier })),
    links: f.org_links ?? [],
    needs: (f.org_needs ?? []).map((n) => ({
      kind: n.kind,
      detail: n.detail ?? undefined,
      recurring: n.recurring,
      urgency: n.urgency ?? undefined,
      quantityNote: n.quantity_note ?? undefined,
      deliveryNote: n.delivery_note ?? undefined,
      updatedAt: n.updated_at,
      coveredAt: n.covered_at ?? undefined,
      supplyName: n.supply?.name,
      supplyUnit: n.supply?.unit ?? undefined,
    })),
    endorsements: (f.avales ?? [])
      .filter((a) => a.status === "activo" && a.endorser)
      .map((a) => ({
        byName: a.endorser!.name,
        bySlug: a.endorser!.slug,
        note: a.context_note,
        date: a.created_at,
      })),
  };
}

/** Columnas de organización que piden las dos consultas. */
const ORG_SELECT = `
  id, slug, name, type, description, holder_name, holder_status, urgent, status,
  verification_level, is_validator, province, locality,
  org_channels ( rail, identifier, position ),
  org_links ( kind, url, handle, label ),
  org_needs ( kind, detail, recurring, active, urgency, quantity_note,
              delivery_note, updated_at, covered_at,
              supply:supply_catalog ( name, unit ) ),
  avales:endorsements!endorsements_endorsed_org_id_fkey ( status, context_note,
    created_at, endorser:organizations!endorsements_endorser_org_id_fkey ( name, slug ) )
`;

/**
 * El directorio permanente: todas las entidades publicadas, pertenezcan o
 * no a una campaña. Alimenta los perfiles públicos (/e/[slug]).
 */
export async function getEntities(): Promise<Organization[]> {
  const db = buildClient();
  if (!db) {
    // Sin base, el directorio son las organizaciones del contenido local.
    return TENANTS_LOCAL.flatMap((t) => t.organizations).map(normalizarLocal);
  }
  const { data, error } = await db.from("organizations").select(ORG_SELECT);
  if (error || !data) {
    console.warn(`entidades: Supabase no respondió (${error?.message}), se usa content/`);
    return TENANTS_LOCAL.flatMap((t) => t.organizations).map(normalizarLocal);
  }
  return (data as unknown as FilaOrg[])
    .map(aOrganizacion)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** El contenido versionado no declara nivel: verificado a mano = 2. */
function normalizarLocal(o: Organization): Organization {
  return { ...o, verificationLevel: o.verificationLevel ?? 2 };
}

export async function getTenants(): Promise<Tenant[]> {
  const db = buildClient();
  if (!db) {
    console.log("contenido: desde content/ (sin credenciales de Supabase)");
    return TENANTS_LOCAL;
  }

  const { data, error } = await db
    .from("tenants")
    .select(
      `slug, campaign_key, year, name, short_name, headline, lead,
       disaster_type, emergency_status, country_code, closed_at, results,
       hero_src, hero_width, hero_height, last_reviewed_at,
       tenant_domains ( hostname, is_primary ),
       hotspots ( name, status, hectares ),
       campaign_links ( title, organization, description, url, cta, tone, position ),
       event_activations ( organizations (${ORG_SELECT}) )`,
    );

  if (error || !data?.length) {
    // Que la base no responda no puede dejar el sitio sin publicar.
    console.warn(
      `contenido: Supabase no devolvió datos (${error?.message ?? "vacío"}), se usa content/`,
    );
    return TENANTS_LOCAL;
  }

  console.log(`contenido: ${data.length} campañas desde Supabase`);

  return data.map((t: any): Tenant => {
    const dominios = (t.tenant_domains ?? [])
      .slice()
      .sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary))
      .map((d: any) => d.hostname);

    return {
      slug: t.slug,
      campaign: t.campaign_key,
      year: t.year,
      name: t.name,
      shortName: t.short_name,
      headline: t.headline,
      lead: t.lead,
      disasterType: t.disaster_type,
      emergencyStatus: t.emergency_status,
      countryCode: t.country_code,
      hosts: dominios,
      hero: t.hero_src
        ? { src: t.hero_src, width: t.hero_width, height: t.hero_height }
        : undefined,
      // Lo afirma una persona al revisar, no un trigger: `updated_at` se
      // movería con cualquier escritura y diría "revisado recién" sobre
      // contenido de hace un año.
      lastReviewed: t.last_reviewed_at,
      closedAt: t.closed_at ?? undefined,
      results: t.results ?? undefined,
      // Las entidades de una campaña son las ACTIVADAS en ella: al cerrar,
      // vuelven al directorio permanente sin perder su verificación.
      organizations: (t.event_activations ?? [])
        .map((a: any) => a.organizations)
        .filter(
          (o: any) =>
            o &&
            ESTADOS_PUBLICOS.includes(o.status) &&
            o.verification_level >= 1,
        )
        .map(aOrganizacion)
        .sort((a: Organization, b: Organization) => a.name.localeCompare(b.name, "es")),
      hotspots: (t.hotspots ?? []).map((h: any) => ({
        name: h.name,
        status: h.status,
        hectares: h.hectares === null ? null : Number(h.hectares),
      })),
      campaigns: (t.campaign_links ?? [])
        .slice()
        .sort((a: any, b: any) => a.position - b.position)
        .map((c: any) => ({
          title: c.title,
          organization: c.organization,
          description: c.description,
          url: c.url,
          cta: c.cta,
          tone: c.tone,
        })),
    };
  });
}

export async function getTenant(slug: string): Promise<Tenant | undefined> {
  return (await getTenants()).find((t) => t.slug === slug);
}
