"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el panel, en el navegador.
 *
 * El sitio público es estático y no tiene servidor, así que el panel habla
 * directo con Supabase. Lo que lo hace seguro no es esconder la clave —es
 * pública— sino que **las políticas de fila corren en la base**: un
 * usuario sólo ve y edita las campañas donde es miembro, y eso está
 * probado en `supabase/tests/rls.sql` contra un Postgres real.
 *
 * Dicho de otra forma: si alguien abre la consola y usa esta misma clave a
 * mano, no puede hacer nada que el panel no le deje. La autorización no
 * vive en la interfaz.
 */

let cliente: SupabaseClient | null = null;
let configurado: boolean | null = null;

export async function getBrowserClient(): Promise<SupabaseClient | null> {
  if (cliente) return cliente;
  if (configurado === false) return null;

  try {
    const r = await fetch("/config.json", { cache: "no-store" });
    const { supabaseUrl, supabaseAnonKey } = await r.json();
    if (!supabaseUrl || !supabaseAnonKey) {
      configurado = false;
      return null;
    }
    cliente = createClient(supabaseUrl, supabaseAnonKey);
    configurado = true;
    return cliente;
  } catch {
    configurado = false;
    return null;
  }
}
