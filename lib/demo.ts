"use client";

/** Lee el modo demo del config publicado en el build. */
let cache: boolean | null = null;

export async function esDemo(): Promise<boolean> {
  if (cache !== null) return cache;
  try {
    const r = await fetch("/config.json", { cache: "no-store" });
    cache = Boolean((await r.json()).demoMode);
  } catch {
    cache = false;
  }
  return cache;
}

export const CUENTAS_DEMO = [
  { email: "donante@demo.ambient.ar", rol: "Donante", detalle: "Explorar, filtrar, reportar" },
  { email: "brigada@demo.ambient.ar", rol: "Entidad en proceso", detalle: "Registro y verificación" },
  { email: "validadora@demo.ambient.ar", rol: "Org. validadora", detalle: "Avalar entidades" },
  { email: "moderadora@demo.ambient.ar", rol: "Moderadora regional", detalle: "Cola y checklist" },
  { email: "admin@demo.ambient.ar", rol: "Super admin", detalle: "Wizard y solicitudes" },
] as const;

export const PASSWORD_DEMO = "demo-ayuda-2026";
