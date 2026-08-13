import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el BUILD, no para el navegador.
 *
 * La web pública nunca consulta la base: el contenido se lee una vez, al
 * construir, y se hornea en HTML estático. Consecuencias buscadas:
 *
 * · Un pico de tráfico durante una catástrofe pega contra el CDN. La base
 *   sólo la usa el panel de administración.
 * · Si Supabase se cae en plena emergencia, el sitio sigue en pie. Eso no
 *   es negociable en este proyecto.
 *
 * Devuelve `null` si no hay credenciales, y quien llama cae al contenido
 * versionado en `content/`. El build nunca depende de que la base esté.
 */
export function buildClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/** La clave de servicio saltea RLS. Sólo para el seed y el borde. */
export function serviceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
