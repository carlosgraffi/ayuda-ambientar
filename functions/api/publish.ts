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
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

/**
 * Cada cuántos minutos como máximo se agrupan las publicaciones
 * automáticas (las que disparan los guardados del panel). El botón
 * "Publicar cambios" no espera: quien lo aprieta quiere publicar ya.
 */
const DEBOUNCE_MINUTOS = 5;

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

  /**
   * Publicación con debounce: los guardados del panel avisan con
   * {auto: true} y el rebuild se agrupa — cada edición de necesidades no
   * puede costar un build. La marca de tiempo vive en la base, así que el
   * debounce sobrevive a que esta Function corra en varios lugares.
   */
  let auto = false;
  try {
    auto = Boolean(((await request.json()) as { auto?: boolean }).auto);
  } catch {
    // Sin cuerpo: publicación manual.
  }

  if (auto && env.SUPABASE_SERVICE_ROLE_KEY) {
    const svc = {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };
    const estado = await fetch(
      `${env.SUPABASE_URL}/rest/v1/publish_state?id=eq.1&select=last_triggered_at`,
      { headers: svc },
    );
    const filas = estado.ok
      ? ((await estado.json()) as { last_triggered_at: string | null }[])
      : [];
    const ultima = filas[0]?.last_triggered_at;
    if (
      ultima &&
      Date.now() - new Date(ultima).getTime() < DEBOUNCE_MINUTOS * 60_000
    ) {
      // Hay un build reciente en camino que va a incluir este cambio.
      return new Response(null, { status: 202 });
    }
    await fetch(`${env.SUPABASE_URL}/rest/v1/publish_state?id=eq.1`, {
      method: "PATCH",
      headers: { ...svc, Prefer: "return=minimal" },
      body: JSON.stringify({ last_triggered_at: new Date().toISOString() }),
    });
  }

  const r = await fetch(env.CF_DEPLOY_HOOK_URL, { method: "POST" });
  return new Response(null, { status: r.ok ? 202 : 502 });
};
