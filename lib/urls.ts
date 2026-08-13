import { brand } from "./brand";
import type { Tenant } from "./tenants";

/**
 * La URL canónica de una instancia.
 *
 * Una instancia con dominio propio es canónica ahí: es donde está el
 * posicionamiento acumulado y los enlaces que ya circulan —
 * ayudapatagonia.ar tiene más de un año de historia. Las demás son
 * canónicas en su path de la plataforma.
 *
 * Sin esto, la misma página vive en dos URLs y los buscadores reparten el
 * posicionamiento entre las dos.
 */
export function canonicalUrl(tenant: Tenant): string {
  const propio = tenant.hosts[0];
  return propio ? `https://${propio}/` : `${brand.url}/${tenant.slug}/`;
}

/** El enlace interno, que siempre es el de la plataforma. */
export function instancePath(tenant: Tenant): string {
  return `/${tenant.slug}/`;
}
