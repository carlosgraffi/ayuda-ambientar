/**
 * Siembra el proyecto DEMO: datos ficticios que recorren la matriz entera
 * de roles y estados de la v2.
 *
 *   DEMO_MODE=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:demo
 *
 * ⚠️ NUNCA contra producción. Crea cuentas con contraseña conocida y
 * entidades inventadas; el guardia de abajo se niega si la base ya tiene
 * campañas reales.
 *
 * Todo lo ficticio lo dice en el nombre ("Sierra Ficticia") — un dato
 * inventado que parece real es exactamente lo que este proyecto combate,
 * incluso en su demo.
 */
import { serviceClient } from "../lib/supabase";

/**
 * La contraseña de las cuentas demo viene del entorno: cada despliegue
 * elige la suya y rotarla es volver a correr este seed. En el repo no
 * vive ninguna credencial — ni siquiera la del demo: una contraseña
 * escrita en un repositorio público es una que nadie puede rotar.
 */
const PASSWORD = process.env.DEMO_PASSWORD ?? "";

const USUARIOS = [
  { key: "donante", email: "donante@demo.ambient.ar" },
  { key: "brigada", email: "brigada@demo.ambient.ar" },
  { key: "validadora", email: "validadora@demo.ambient.ar" },
  { key: "moderadora", email: "moderadora@demo.ambient.ar" },
  { key: "admin", email: "admin@demo.ambient.ar" },
] as const;

async function main() {
  const db = serviceClient();
  if (!db) {
    console.error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  if (PASSWORD.length < 12) {
    console.error(
      "Falta DEMO_PASSWORD (12+ caracteres). Es la contraseña de las cinco cuentas demo; elegila por despliegue.",
    );
    process.exit(1);
  }

  // ── Guardia anti-producción ──────────────────────────────────────────
  const { data: reales } = await db
    .from("tenants")
    .select("slug")
    .not("slug", "like", "demo-%");
  if (reales?.length) {
    console.error(
      `Esta base tiene ${reales.length} campañas que no son demo (${reales
        .map((t) => t.slug)
        .join(", ")}). El seed de demo sólo corre en un proyecto vacío o de demo.`,
    );
    process.exit(1);
  }

  // ── Usuarios ─────────────────────────────────────────────────────────
  const ids: Record<string, string> = {};
  for (const u of USUARIOS) {
    const r = await db.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (r.data.user) ids[u.key] = r.data.user.id;
    else {
      const { data } = await db.auth.admin.listUsers();
      const existente = data.users.find((x) => x.email === u.email);
      if (!existente) throw new Error(`no pude crear ${u.email}: ${r.error?.message}`);
      ids[u.key] = existente.id;
      // Re-correr el seed con otra DEMO_PASSWORD rota las cuentas.
      await db.auth.admin.updateUserById(existente.id, { password: PASSWORD });
    }
  }
  console.log("✓ 5 cuentas demo");

  await db.from("super_admins").upsert({ user_id: ids.admin });
  await db.from("moderator_regions").upsert([
    { user_id: ids.moderadora, province: "Córdoba" },
    { user_id: ids.moderadora, province: "Chubut" },
  ]);

  // ── Instancias: dos activas de distinto tipo, una cerrada ────────────
  const tenants: Record<string, unknown>[] = [
    {
      slug: "demo-incendio-sierra-2026", campaign_key: "demo-incendio-sierra", year: 2026,
      name: "Incendio — Sierra Ficticia", short_name: "Sierra Ficticia",
      headline: "¿Cómo **ayudar** con el incendio en la Sierra Ficticia?",
      lead: "Brigadas y organizaciones de las sierras de Córdoba, relevadas y verificadas (datos de demostración).",
      disaster_type: "fuego", disaster_type_key: "incendio_forestal",
      emergency_status: "activa", provinces: ["Córdoba"],
    },
    {
      slug: "demo-inundacion-valle-2026", campaign_key: "demo-inundacion-valle", year: 2026,
      name: "Inundación — Valle Ficticio", short_name: "Valle Ficticio",
      headline: "¿Cómo **ayudar** a las familias del Valle Ficticio?",
      lead: "Organizaciones que asisten a familias afectadas por la crecida (datos de demostración).",
      disaster_type: "agua", disaster_type_key: "inundacion",
      emergency_status: "activa", provinces: ["Chubut"],
    },
    {
      slug: "demo-temporal-costa-2025", campaign_key: "demo-temporal-costa", year: 2025,
      name: "Temporal — Costa Ficticia", short_name: "Costa Ficticia",
      headline: "¿Cómo **ayudar** tras el temporal en la Costa Ficticia?",
      lead: "La campaña histórica cerrada del demo.",
      disaster_type: "viento", disaster_type_key: "temporal",
      emergency_status: "recuperacion", provinces: ["Buenos Aires"],
      closed_at: "2025-11-30T00:00:00-03:00",
      results: { visits: 12480, aliasCopies: 861, transferClicks: 512, shares: 233 },
    },
  ];
  const tid: Record<string, string> = {};
  for (const t of tenants) {
    const { data, error } = await db.from("tenants")
      .upsert(t as never, { onConflict: "slug" }).select("id").single();
    if (error || !data) throw new Error(`tenant ${t.slug}: ${error?.message}`);
    tid[t.slug as string] = data.id;
  }
  console.log("✓ 3 instancias (2 activas, 1 cerrada)");

  // ── Entidades: la matriz completa ────────────────────────────────────
  type Semilla = {
    slug: string; name: string; type: string; description: string;
    province: string; locality: string; level: 0 | 1 | 2;
    status?: string; validator?: boolean; owner?: string;
    holder?: string; alias?: string; nota?: string;
  };
  const entidades: Semilla[] = [
    { slug: "demo-brigada-sierra", name: "Brigada Sierra Ficticia", type: "brigada",
      description: "Brigada voluntaria que combate el fuego en las sierras (demo).",
      province: "Córdoba", locality: "Villa Ficticia", level: 2, validator: true,
      owner: "validadora", holder: "Asoc. Civil Brigada Sierra", alias: "demo.brigada.sierra" },
    { slug: "demo-bomberos-valle", name: "Bomberos Voluntarios del Valle", type: "bomberos",
      description: "Cuartel de bomberos voluntarios del Valle Ficticio (demo).",
      province: "Chubut", locality: "Valle Ficticio", level: 2,
      holder: "Asoc. Bomberos Voluntarios Valle", alias: "demo.bomberos.valle" },
    { slug: "demo-merendero-luna", name: "Merendero La Luna", type: "viandas",
      description: "Viandas y acopio para familias evacuadas (demo).",
      province: "Córdoba", locality: "Villa Ficticia", level: 1,
      holder: "María Demo", alias: "demo.merendero.luna" },
    { slug: "demo-red-vecinal", name: "Red Vecinal del Arroyo", type: "red_informal",
      description: "Vecines autoconvocades del arroyo (demo).",
      province: "Chubut", locality: "Valle Ficticio", level: 1,
      holder: "Juan Demo", alias: "demo.red.arroyo" },
    { slug: "demo-ong-raices", name: "ONG Raíces", type: "ong",
      description: "Reforestación y acompañamiento post-incendio (demo).",
      province: "Córdoba", locality: "Sierra Alta", level: 1,
      holder: "Fundación Raíces Demo", alias: "demo.ong.raices" },
    { slug: "demo-brigada-nueva", name: "Brigada Nueva del Cerro", type: "brigada",
      description: "Brigada recién formada, en proceso de verificación (demo).",
      province: "Córdoba", locality: "Cerro Ficticio", level: 0, status: "en_revision",
      owner: "brigada", holder: "Pedro Demo", alias: "demo.brigada.cerro" },
    { slug: "demo-comedor-sol", name: "Comedor El Sol", type: "viandas",
      description: "Comedor comunitario en registro (demo).",
      province: "Chubut", locality: "Valle Ficticio", level: 0, status: "en_revision",
      holder: "Rosa Demo", alias: "demo.comedor.sol" },
    { slug: "demo-colecta-rechazada", name: "Colecta Sin Datos", type: "otro",
      description: "Registro devuelto: faltan datos verificables (demo).",
      province: "Córdoba", locality: "—", level: 0, status: "borrador",
      nota: "El alias no resuelve al titular declarado y no encontramos huella pública. Corregí los datos y reenviá." },
    { slug: "demo-entidad-suspendida", name: "Entidad Suspendida", type: "otro",
      description: "Suspendida tras reportes validados (demo).",
      province: "Córdoba", locality: "—", level: 0, status: "archivada",
      nota: "Tres reportes validados: el alias cambió de titular sin aviso." },
  ];

  const oid: Record<string, string> = {};
  for (const e of entidades) {
    const { data, error } = await db.from("organizations").upsert({
      slug: e.slug, name: e.name, type: e.type, description: e.description,
      province: e.province, locality: e.locality,
      verification_level: e.level, is_validator: e.validator ?? false,
      status: e.status ?? "verificada",
      holder_name: e.holder ?? null,
      holder_status: e.holder ? "declarado" : "no_declarado",
      owner_user_id: e.owner ? ids[e.owner] : null,
      moderation_note: e.nota ?? null,
    }, { onConflict: "slug" }).select("id").single();
    if (error || !data) throw new Error(`${e.slug}: ${error?.message}`);
    oid[e.slug] = data.id;
    if (e.alias) {
      await db.from("org_channels").upsert(
        { org_id: data.id, rail: "alias_ar", identifier: e.alias, position: 0 },
        { onConflict: "id", ignoreDuplicates: true },
      );
      await db.from("org_channels").delete().eq("org_id", data.id);
      await db.from("org_channels").insert({
        org_id: data.id, rail: "alias_ar", identifier: e.alias, position: 0,
      });
    }
  }
  console.log(`✓ ${entidades.length} entidades (matriz completa)`);

  // ── Activaciones en las instancias activas ───────────────────────────
  const activar: [string, string][] = [
    ["demo-incendio-sierra-2026", "demo-brigada-sierra"],
    ["demo-incendio-sierra-2026", "demo-merendero-luna"],
    ["demo-incendio-sierra-2026", "demo-ong-raices"],
    ["demo-inundacion-valle-2026", "demo-bomberos-valle"],
    ["demo-inundacion-valle-2026", "demo-red-vecinal"],
  ];
  for (const [t, o] of activar)
    await db.from("event_activations")
      .upsert({ tenant_id: tid[t], org_id: oid[o] }, { onConflict: "tenant_id,org_id" });

  // ── Checklist primero: el recálculo por avales lee la huella ────────
  await db.from("verification_checks").delete().gte("created_at", "1970-01-01");
  await db.from("verification_checks").insert([
    { org_id: oid["demo-brigada-sierra"], moderator_id: ids.moderadora,
      check_type: "titularidad", result: "ok", notes: "Constancia de CBU a nombre de la asociación." },
    { org_id: oid["demo-brigada-sierra"], moderator_id: ids.moderadora,
      check_type: "registro", result: "ok", notes: "Registro provincial de brigadas 2025." },
    { org_id: oid["demo-bomberos-valle"], moderator_id: ids.moderadora,
      check_type: "titularidad", result: "ok", notes: "Titular verificado por homebanking." },
    // El camino "1 aval + huella" a nivel 1: la ONG tiene historia pública.
    { org_id: oid["demo-ong-raices"], moderator_id: ids.moderadora,
      check_type: "huella_publica", result: "ok",
      notes: "Instagram con 4 años de historia y notas en dos medios locales." },
  ]);

  // ── Avales: cruzados, y un pedido pendiente para la validadora ──────
  await db.from("endorsements").delete().gte("created_at", "1970-01-01");
  await db.from("endorsements").insert([
    { endorser_org_id: oid["demo-brigada-sierra"], endorsed_org_id: oid["demo-merendero-luna"],
      status: "activo", context_note: "Cocinan para nuestra base desde el incendio de 2025." },
    { endorser_org_id: oid["demo-bomberos-valle"], endorsed_org_id: oid["demo-merendero-luna"],
      status: "activo", context_note: "Coordinamos entregas de viandas con ellas." },
    { endorser_org_id: oid["demo-brigada-sierra"], endorsed_org_id: oid["demo-ong-raices"],
      status: "activo", context_note: "Reforestamos juntas la ladera norte." },
    { endorser_org_id: oid["demo-bomberos-valle"], endorsed_org_id: oid["demo-red-vecinal"],
      status: "activo", context_note: "Son nuestros ojos en el arroyo." },
    { endorser_org_id: oid["demo-brigada-sierra"], endorsed_org_id: oid["demo-red-vecinal"],
      status: "activo", context_note: "Nos avisaron del foco del arroyo antes que nadie." },
    // El pedido que la cuenta validadora@ resuelve en el tour:
    { endorser_org_id: oid["demo-brigada-sierra"], endorsed_org_id: oid["demo-brigada-nueva"],
      status: "solicitado", created_by: ids.brigada },
  ]);

  // ── Reportes ─────────────────────────────────────────────────────────
  await db.from("reports").delete().gte("created_at", "1970-01-01");
  await db.from("reports").insert({
    org_id: oid["demo-merendero-luna"], reason: "datos_incorrectos",
    detail: "En su Instagram figura otro alias distinto al publicado acá.",
    reporter_contact: "vecina@demo.ambient.ar",
  });

  // ── Necesidades: estados variados y una vencida ─────────────────────
  const insumo = async (nombre: string) =>
    (await db.from("supply_catalog").select("id").eq("name", nombre).single()).data?.id;
  await db.from("org_needs").delete().gte("updated_at", "1970-01-01");
  const necesidades = [
    { org: "demo-brigada-sierra", item: "Motobombas", urgency: "urgente",
      quantity_note: "2, en buen estado", delivery_note: "Base de la brigada, 9 a 18" },
    { org: "demo-brigada-sierra", item: "Antiparras", urgency: "se_necesita" },
    { org: "demo-brigada-sierra", item: "Bidones de agua", urgency: "cubierto" },
    { org: "demo-bomberos-valle", item: "Bombas de achique", urgency: "urgente",
      quantity_note: "las que haya" },
    { org: "demo-bomberos-valle", item: "Botas de goma", urgency: "se_necesita",
      quantity_note: "talles 38 a 44" },
    { org: "demo-merendero-luna", item: "Alimentos no perecederos", urgency: "urgente",
      delivery_note: "Merendero, tardes" },
    { org: "demo-red-vecinal", item: "Frazadas", urgency: "se_necesita" },
  ];
  for (const n of necesidades) {
    await db.from("org_needs").insert({
      org_id: oid[n.org], kind: "insumos", supply_id: await insumo(n.item),
      urgency: n.urgency, quantity_note: n.quantity_note ?? null,
      delivery_note: n.delivery_note ?? null,
      covered_at: n.urgency === "cubierto" ? new Date().toISOString() : null,
    });
  }
  // La desactualizada: ONG Raíces no toca sus necesidades hace 9 días.
  await db.from("org_needs").insert({
    org_id: oid["demo-ong-raices"], kind: "insumos",
    supply_id: await insumo("Guantes de trabajo"), urgency: "se_necesita",
  });
  await db.from("org_needs")
    .update({ updated_at: new Date(Date.now() - 9 * 864e5).toISOString() })
    .eq("org_id", oid["demo-ong-raices"]);
  console.log("✓ avales, checklist, reporte y necesidades (una vencida)");

  console.log(`\nListo. Cuentas: ${USUARIOS.map((u) => u.email).join(", ")}`);
  console.log("Contraseña de todas: la de DEMO_PASSWORD.");
}

main();
