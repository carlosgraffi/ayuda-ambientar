/**
 * Sube el contenido de `content/` a Supabase.
 *
 *   npm run seed
 *
 * Es idempotente: se puede correr las veces que haga falta. Usa la clave
 * de servicio, que saltea RLS — por eso corre a mano y nunca en el build.
 *
 * Después del primer seed, la base pasa a ser la fuente y `content/` queda
 * como respaldo para que el sitio se pueda publicar aunque Supabase esté
 * caído. Ver `lib/content.ts`.
 */
import { TENANTS } from "../lib/tenants";
import { serviceClient } from "../lib/supabase";

async function main() {
  const db = serviceClient();
  if (!db) {
    console.error(
      "Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.",
    );
    process.exit(1);
  }

  for (const t of TENANTS) {
    const { data: tenant, error } = await db
      .from("tenants")
      .upsert(
        {
          slug: t.slug,
          campaign_key: t.campaign,
          year: t.year,
          name: t.name,
          short_name: t.shortName,
          headline: t.headline,
          lead: t.lead,
          disaster_type: t.disasterType,
          emergency_status: t.emergencyStatus,
          country_code: t.countryCode,
          hero_src: t.hero?.src ?? null,
          hero_width: t.hero?.width ?? null,
          hero_height: t.hero?.height ?? null,
          closed_at: t.closedAt ?? null,
          last_reviewed_at: t.lastReviewed,
          results: t.results ?? {},
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (error || !tenant) {
      console.error(`✗ ${t.slug}: ${error?.message}`);
      process.exit(1);
    }

    const tenantId = tenant.id as string;

    if (t.hosts.length) {
      await db.from("tenant_domains").upsert(
        t.hosts.map((h, i) => ({
          tenant_id: tenantId,
          hostname: h,
          is_primary: i === 0,
        })),
        { onConflict: "hostname" },
      );
    }

    // Focos y campañas se reemplazan enteros: son listas cortas y no tienen
    // clave natural estable. Las organizaciones NO — ver abajo.
    await db.from("hotspots").delete().eq("tenant_id", tenantId);
    if (t.hotspots.length) {
      await db.from("hotspots").insert(
        t.hotspots.map((h) => ({
          tenant_id: tenantId,
          name: h.name,
          status: h.status,
          hectares: h.hectares,
        })),
      );
    }

    await db.from("campaign_links").delete().eq("tenant_id", tenantId);
    if (t.campaigns.length) {
      await db.from("campaign_links").insert(
        t.campaigns.map((c, i) => ({
          tenant_id: tenantId,
          title: c.title,
          organization: c.organization,
          description: c.description,
          url: c.url,
          cta: c.cta,
          tone: c.tone,
          position: i,
        })),
      );
    }

    for (const org of t.organizations) {
      /**
       * Upsert por (tenant, slug), nunca delete: una organización puede
       * tener verificaciones y eventos colgando, y borrarla los perdería.
       * El esquema archiva, no borra.
       *
       * Se siembran como `verificada` porque son los datos que el sitio ya
       * venía publicando. El flujo real de verificación llega en F4.
       */
      const { data: fila, error: e } = await db
        .from("organizations")
        .upsert(
          {
            tenant_id: tenantId,
            slug: org.slug,
            name: org.name,
            type: org.type,
            description: org.description,
            holder_name: org.holderName,
            holder_status: org.holderStatus,
            urgent: org.urgent,
            status: "verificada",
          },
          { onConflict: "tenant_id,slug" },
        )
        .select("id")
        .single();

      if (e || !fila) {
        console.error(`✗ ${t.slug}/${org.slug}: ${e?.message}`);
        process.exit(1);
      }

      const orgId = fila.id as string;

      // Lo que cuelga de la organización sí se reemplaza: son sus datos de
      // contacto, no tienen historia propia que preservar.
      await db.from("org_channels").delete().eq("org_id", orgId);
      await db.from("org_channels").insert(
        org.channels.map((c, i) => ({
          org_id: orgId,
          rail: c.rail,
          identifier: c.identifier,
          position: i,
        })),
      );

      await db.from("org_links").delete().eq("org_id", orgId);
      if (org.links.length) {
        await db.from("org_links").insert(
          org.links.map((l) => ({
            org_id: orgId,
            kind: l.kind,
            url: l.url,
            handle: l.handle ?? null,
            label: l.label ?? null,
          })),
        );
      }

      await db.from("org_needs").delete().eq("org_id", orgId);
      if (org.needs.length) {
        await db.from("org_needs").insert(
          org.needs.map((n) => ({
            org_id: orgId,
            kind: n.kind,
            detail: n.detail ?? null,
            recurring: n.recurring ?? false,
          })),
        );
      }
    }

    console.log(`✓ ${t.slug}: ${t.organizations.length} organizaciones`);
  }

  console.log("Seed completo.");
}

main();
