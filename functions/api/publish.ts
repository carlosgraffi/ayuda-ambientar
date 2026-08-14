/**
 * Dispara una reconstrucción del sitio.
 *
 * El contenido se lee en el build, así que guardar en la base no cambia lo
 * que ve la gente hasta que esto corre.
 *
 * El hook vive acá y no en el navegador porque es una URL que dispara un
 * deploy: cualquiera que la viera podría gastar builds a voluntad. Y se
 * exige una sesión válida de Supabase, para que no alcance con conocer la
 * ruta.
 */
interface Env {
  CF_DEPLOY_HOOK_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.CF_DEPLOY_HOOK_URL) {
    // 501 y no 500: no está roto, falta configurarlo. El panel lo distingue.
    return new Response("falta CF_DEPLOY_HOOK_URL", { status: 501 });
  }

  const token = (request.headers.get("Authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return new Response("sin sesión", { status: 401 });
  }

  // Se valida contra Supabase en vez de decodificar el token acá: un JWT
  // se puede fabricar, una sesión no.
  const quien = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY },
  });
  if (!quien.ok) return new Response("sesión inválida", { status: 401 });

  const r = await fetch(env.CF_DEPLOY_HOOK_URL, { method: "POST" });
  return new Response(null, { status: r.ok ? 202 : 502 });
};
