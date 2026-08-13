/**
 * Registro de interacciones.
 *
 * Reemplaza a los contadores de Firestore, que tenían dos problemas: sus
 * reglas permitían escribir desde el cliente —cualquiera podía inflar un
 * número desde la consola del navegador— y dejaron de registrar el mismo
 * día que se instalaron, sin que nadie se enterara durante toda una
 * campaña.
 *
 * Acá el navegador no toca la base: manda un `POST` a esta Function, que
 * inserta con la clave de servicio. Esa clave vive en el entorno del
 * Worker y nunca viaja al cliente.
 *
 * Qué se guarda: la campaña, la organización y qué se tocó. Nada más. No
 * hay identificador de persona, ni IP, ni cookie. Alcanza para el resumen
 * de una campaña y no convierte en dato a quien está por donar.
 *
 * `abrir_transferencia` es exactamente eso: alguien abrió la app de pago.
 * No sabemos si terminó donando y no vamos a insinuar que sí — la plata
 * nunca pasa por acá.
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const TIPOS = ["copiar_alias", "abrir_transferencia", "compartir"];

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  // Sin credenciales el sitio funciona igual, sólo que no mide. Nunca un
  // error visible: la persona está tratando de donar.
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(null, { status: 204 });
  }

  let cuerpo: { tenant?: string; org?: string; kind?: string };
  try {
    cuerpo = await request.json();
  } catch {
    return new Response("json inválido", { status: 400 });
  }

  if (!cuerpo.tenant || !cuerpo.kind || !TIPOS.includes(cuerpo.kind)) {
    return new Response("faltan datos", { status: 400 });
  }

  const cabeceras = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  // Se resuelven los slugs contra la base en vez de confiar en lo que
  // mandó el cliente: así un id inventado no crea una fila huérfana.
  const url = new URL(env.SUPABASE_URL);
  const buscar = async (tabla: string, filtro: string) => {
    const r = await fetch(
      `${url.origin}/rest/v1/${tabla}?select=id&${filtro}&limit=1`,
      { headers: cabeceras },
    );
    const filas = r.ok ? ((await r.json()) as { id: string }[]) : [];
    return filas[0]?.id ?? null;
  };

  const tenantId = await buscar(
    "tenants",
    `slug=eq.${encodeURIComponent(cuerpo.tenant)}`,
  );
  if (!tenantId) return new Response("campaña desconocida", { status: 404 });

  const orgId = cuerpo.org
    ? await buscar(
        "organizations",
        `tenant_id=eq.${tenantId}&slug=eq.${encodeURIComponent(cuerpo.org)}`,
      )
    : null;

  await fetch(`${url.origin}/rest/v1/click_events`, {
    method: "POST",
    headers: { ...cabeceras, Prefer: "return=minimal" },
    body: JSON.stringify({
      tenant_id: tenantId,
      org_id: orgId,
      kind: cuerpo.kind,
    }),
  });

  return new Response(null, { status: 204 });
};
