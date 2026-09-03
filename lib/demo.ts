"use client";

/** Lee el modo demo (y su contraseña) del config publicado en el build. */
let cache: { demo: boolean; password: string | null } | null = null;

async function leer() {
  if (cache) return cache;
  try {
    const r = await fetch("/config.json", { cache: "no-store" });
    const c = await r.json();
    cache = { demo: Boolean(c.demoMode), password: c.demoPassword ?? null };
  } catch {
    cache = { demo: false, password: null };
  }
  return cache;
}

export async function esDemo(): Promise<boolean> {
  return (await leer()).demo;
}

export async function demoPassword(): Promise<string | null> {
  return (await leer()).password;
}

export const CUENTAS_DEMO = [
  { email: "donante@demo.ambient.ar", rol: "Donante", detalle: "Explorar, filtrar, reportar" },
  { email: "brigada@demo.ambient.ar", rol: "Entidad en proceso", detalle: "Registro y verificación" },
  { email: "validadora@demo.ambient.ar", rol: "Org. validadora", detalle: "Avalar entidades" },
  { email: "moderadora@demo.ambient.ar", rol: "Moderadora regional", detalle: "Cola y checklist" },
  { email: "admin@demo.ambient.ar", rol: "Super admin", detalle: "Wizard y solicitudes" },
] as const;

