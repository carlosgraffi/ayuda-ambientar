import type { Metadata } from "next";
import { TopBar } from "@/components/site/TopBar";

export const metadata: Metadata = {
  title: "El viaje de una entidad",
  description: "Del auto-registro al widget embebido: cómo funciona la verificación distribuida.",
};

/**
 * El tour transversal: la historia de una brigada ficticia desde que se
 * registra hasta que aparece embebida en un diario. Es la explicación del
 * sistema completo contada en orden — para quien evalúa replicar la
 * plataforma, o para el equipo de una instancia nueva.
 */
const PASOS = [
  {
    titulo: "Se registra sola",
    quien: "La brigada",
    texto:
      "Desde el celular, en diez minutos: qué es, dónde está, el alias CON su titular, y hasta tres organizaciones que la conocen. Entra en nivel 0 — invisible para el público, visible para ella y para la moderación de su provincia.",
    enlace: { href: "/registrarse/", texto: "El formulario real" },
  },
  {
    titulo: "Pide avales",
    quien: "La comunidad",
    texto:
      "Las organizaciones que indicó reciben el pedido en su panel. Avalar exige una línea de contexto pública: «trabajamos juntas en el incendio de 2025». Un aval que no puede decir de dónde se conocen no está avalando nada.",
  },
  {
    titulo: "Con dos avales, se publica sola",
    quien: "El sistema",
    texto:
      "Nivel 1, badge amarillo, con la lista de quiénes la avalan. Ningún administrador en el medio: la comunidad que ya está verificada sostiene a la que llega. Y si una avalista cae, los niveles que dependían de ella se recalculan.",
  },
  {
    titulo: "La moderación completa el checklist",
    quien: "La moderadora regional",
    texto:
      "Titularidad de la cuenta (el alias resuelve al nombre declarado), registro oficial, huella pública. Sólo una persona sube a nivel 2 — el badge verde — y todo queda en el registro: quién chequeó qué, cuándo y cómo.",
  },
  {
    titulo: "Se activa en la emergencia",
    quien: "El evento",
    texto:
      "Al subir de nivel se activa sola en los eventos abiertos de su provincia, marcada para revisión. Cuando la campaña cierra, vuelve al directorio permanente sin perder nada: la verificación es de la entidad, no de la emergencia.",
  },
  {
    titulo: "Mantiene sus necesidades",
    quien: "La brigada, cada día",
    texto:
      "Motobombas URGENTE, antiparras SE NECESITA, agua CUBIERTO — tres toques desde el celular. El sitio muestra hace cuánto lo actualizó, y si pasan siete días en emergencia, lo dice: «puede estar desactualizado».",
  },
  {
    titulo: "Aparece donde la gente ya está",
    quien: "Los datos abiertos",
    texto:
      "Un diario regional incrusta el widget con una línea de script; un municipio consume la API. La atribución viaja siempre — y el nivel 0 no existe para la API por el mismo mecanismo por el que no existe para el sitio.",
    enlace: { href: "/demo-embed/", texto: "Verlo embebido en un diario" },
  },
];

export default function Tour() {
  return (
    <>
      <TopBar />
      <main id="contenido" className="container section-tight">
        <div className="container-text flex flex-col gap-10">
          <div>
            <p className="eyebrow">Cómo funciona</p>
            <h1 className="display-2 mt-3">
              El viaje de una <b>entidad</b>
            </h1>
            <p className="lead mt-4">
              De una brigada recién formada a aparecer, verificada, en el
              widget de un diario. Siete pasos, ningún administrador único en
              el medio.
            </p>
          </div>

          <ol className="flex flex-col">
            {PASOS.map((p, i) => (
              <li
                key={p.titulo}
                className="flex flex-col gap-2 py-6"
                style={{ borderTop: "1px solid var(--border-hairline)" }}
              >
                <p className="eyebrow">
                  <span className="num">{i + 1}</span> · {p.quien}
                </p>
                <h2 className="heading-3">{p.titulo}</h2>
                <p style={{ color: "var(--text-muted)" }}>{p.texto}</p>
                {p.enlace && (
                  <a href={p.enlace.href} className="text-sm">
                    {p.enlace.texto} →
                  </a>
                )}
              </li>
            ))}
          </ol>

          <div className="card card-subtle">
            <p style={{ color: "var(--text-muted)" }}>
              La regla detrás de los siete pasos: <b style={{ color: "var(--text-strong)" }}>
              ningún rol se auto-eleva</b>. El owner no se publica solo, quien
              avala no aprueba, quien aprueba no designa moderadores — y todo
              deja constancia. No lo garantiza esta página sino la base de
              datos, con pruebas que lo verifican en cada cambio.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
