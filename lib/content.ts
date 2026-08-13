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
  slug: string;
  name: string;
  type: Organization["type"];
  description: string;
  holder_name: string | null;
  holder_status: Organization["holderStatus"];
  urgent: boolean;
  org_channels: { rail: string; identifier: string; position: number }[];
  org_links: OrgLink[];
  org_needs: { kind: OrgNeed["kind"]; detail: string | null; recurring: boolean }[];
};

function aOrganizacion(f: FilaOrg): Organization {
  return {
    slug: f.slug,
    name: f.name,
    type: f.type,
    description: f.description,
    holderName: f.holder_name,
    holderStatus: f.holder_status,
    urgent: f.urgent,
    channels: [...f.org_channels]
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ rail: c.rail as never, identifier: c.identifier })),
    links: f.org_links ?? [],
    needs: (f.org_needs ?? []).map((n) => ({
      kind: n.kind,
      detail: n.detail ?? undefined,
      recurring: n.recurring,
    })),
  };
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
       organizations (
         slug, name, type, description, holder_name, holder_status, urgent, status,
         org_channels ( rail, identifier, position ),
         org_links ( kind, url, handle, label ),
         org_needs ( kind, detail, recurring, active )
       )`,
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
      organizations: (t.organizations ?? [])
        .filter((o: any) => ESTADOS_PUBLICOS.includes(o.status))
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
