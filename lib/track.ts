/**
 * Avisa al borde que alguien copió un alias, abrió la app de pago o
 * compartió una organización.
 *
 * Tres reglas, todas por el mismo motivo — la persona está en mitad de
 * una donación y nada de esto puede estorbarla:
 *
 * 1. Nunca se espera la respuesta. La acción del usuario sigue su curso.
 * 2. Nunca falla hacia afuera. Si no hay red, no se mide y ya.
 * 3. `keepalive`, porque "abrir transferencia" navega fuera de la página
 *    y sin eso el navegador cancelaría el pedido a mitad de camino.
 */
export type TrackKind = "copiar_alias" | "abrir_transferencia" | "compartir";

export function track(tenant: string, kind: TrackKind, org?: string): void {
  if (typeof navigator === "undefined") return;
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, kind, org }),
      keepalive: true,
    }).catch(() => {
      // Medir es secundario. Donar no.
    });
  } catch {
    // Idem.
  }
}
