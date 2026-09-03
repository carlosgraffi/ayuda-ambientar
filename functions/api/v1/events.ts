import { type ApiEnv, respuesta, rest, sinConfig, onRequestOptions } from "./_shared";

export { onRequestOptions };

/** GET /api/v1/events — las emergencias, abiertas y cerradas. */
export const onRequestGet: PagesFunction<ApiEnv> = async ({ env }) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return sinConfig();
  try {
    const filas = await rest(
      env,
      "tenants?select=slug,name,year,disaster_type_key,provinces,localities,emergency_status,closed_at,last_reviewed_at&order=year.desc",
    );
    return respuesta(
      (filas as Record<string, unknown>[]).map((t) => ({
        ...t,
        status: t.closed_at ? "closed" : "active",
      })),
    );
  } catch {
    return respuesta({ error: "temporalmente sin datos" }, 502);
  }
};
