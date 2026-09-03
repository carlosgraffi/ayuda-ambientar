import { type ApiEnv, respuesta, rest, sinConfig, onRequestOptions } from "./_shared";

export { onRequestOptions };

/**
 * GET /api/v1/entities — el directorio publicado.
 *
 * Filtros: ?event=<slug> (activadas en esa emergencia), ?province=,
 * ?need=<nombre de insumo> (lo necesitan ahora), ?level=2.
 * Nivel 0 no existe para esta API: RLS lo garantiza, no un if.
 */
const CAMPOS =
  "slug,name,type,description,province,locality,verification_level," +
  "holder_name,holder_status," +
  "org_channels(rail,identifier)," +
  "org_needs(kind,urgency,quantity_note,delivery_note,updated_at,supply:supply_catalog(name,unit))," +
  "avales:endorsements!endorsements_endorsed_org_id_fkey(status,context_note," +
  "endorser:organizations!endorsements_endorser_org_id_fkey(name,slug))";


export const onRequestGet: PagesFunction<ApiEnv> = async ({ env, request }) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return sinConfig();
  const q = new URL(request.url).searchParams;

  // El hint !inner vive DENTRO del select: como parámetro suelto,
  // PostgREST lo ignora y el filtro queda apuntando a la nada.
  let campos = CAMPOS;
  let filtros = "&status=in.(verificada,pausada)&order=name";
  if (q.get("province")) filtros += `&province=eq.${encodeURIComponent(q.get("province")!)}`;
  if (q.get("level")) filtros += `&verification_level=gte.${Number(q.get("level")) || 1}`;

  try {
    if (q.get("event")) {
      // El slug se resuelve a id primero: filtrar un embed anidado por
      // columna de otra tabla no es algo que PostgREST exprese bien.
      const t = (await rest(
        env,
        `tenants?select=id&slug=eq.${encodeURIComponent(q.get("event")!)}&limit=1`,
      )) as { id: string }[];
      if (!t.length) return respuesta([]);
      campos += ",event_activations!inner(tenant_id)";
      filtros += `&event_activations.tenant_id=eq.${t[0].id}`;
    }
    const path = `organizations?select=${campos}${filtros}`;

    let filas = (await rest(env, path)) as Record<string, any>[];

    if (q.get("need")) {
      const insumo = q.get("need")!.toLowerCase();
      filas = filas.filter((f) =>
        (f.org_needs ?? []).some(
          (n: any) =>
            n.supply?.name?.toLowerCase() === insumo && n.urgency !== "cubierto",
        ),
      );
    }

    return respuesta(
      filas.map((f) => ({
        ...f,
        avales: (f.avales ?? []).filter((a: any) => a.status === "activo"),
        last_updated: (f.org_needs ?? [])
          .map((n: any) => n.updated_at)
          .sort()
          .at(-1) ?? null,
      })),
    );
  } catch {
    return respuesta({ error: "temporalmente sin datos" }, 502);
  }
};
