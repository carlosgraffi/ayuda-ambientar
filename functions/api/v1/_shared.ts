/**
 * Lo común de la API pública v1.
 *
 * Solo lectura, sin autenticación: las consultas van a Supabase con la
 * clave anónima, así que RLS decide qué sale — una entidad nivel 0 no
 * aparece acá por el mismo mecanismo por el que no aparece en el sitio.
 * No hay una segunda lista que mantener sincronizada.
 *
 * La atribución viaja en TODA respuesta y no es opcional: el trato de los
 * datos abiertos es que se sepa de dónde salen.
 */

export interface ApiEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export const ATTRIBUTION = {
  name: "ayuda.ambient.ar — de Rediseñ.ar y ambient.ar",
  url: "https://ayuda.ambient.ar",
  license: "Datos abiertos con atribución obligatoria",
} as const;

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export function respuesta(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ attribution: ATTRIBUTION, data }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Cache corto en el borde: fresco para una emergencia, barato para
      // un pico. El widget no golpea la base.
      "Cache-Control": "public, max-age=60",
      ...CORS,
    },
  });
}

export function sinConfig(): Response {
  return respuesta({ error: "API no configurada en este despliegue" }, 503);
}

export async function rest(env: ApiEnv, path: string): Promise<unknown[]> {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: env.SUPABASE_ANON_KEY! },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return (await r.json()) as unknown[];
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });
