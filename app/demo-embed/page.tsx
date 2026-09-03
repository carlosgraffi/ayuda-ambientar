import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo de embebido",
  robots: { index: false, follow: false },
};

/**
 * Un diario regional simulado, para mostrar el widget funcionando en un
 * sitio ajeno: estética propia del "diario", y adentro el listado con la
 * atribución que el anfitrión no puede sacar.
 */
export default function DemoEmbed() {
  return (
    <main
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        maxWidth: 720,
        margin: "0 auto",
        padding: "32px 20px",
      }}
    >
      <p style={{ textTransform: "uppercase", letterSpacing: 2, fontSize: 12, color: "#888" }}>
        El Diario de la Comarca · sitio de demostración
      </p>
      <h1 style={{ fontSize: 34, lineHeight: 1.15, margin: "12px 0" }}>
        Dónde ayudar: el listado verificado de organizaciones
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: "#333" }}>
        Publicamos el listado de entidades verificadas que reciben donaciones,
        directo de la plataforma. Este recuadro se actualiza solo y cada
        entidad muestra su nivel de verificación:
      </p>

      <script src="/widget.js" async />

      <p style={{ fontSize: 14, color: "#777", marginTop: 24 }}>
        Así se ve el widget de ayuda.ambient.ar embebido en un medio: una
        línea de script, filtros opcionales por emergencia o provincia, y la
        atribución siempre visible dentro del recuadro.
      </p>
    </main>
  );
}
