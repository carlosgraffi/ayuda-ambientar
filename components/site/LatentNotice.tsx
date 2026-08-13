import { Megaphone, PlusCircle, Send } from "lucide-react";
import { brand } from "@/lib/brand";

/**
 * Qué muestra la portada cuando no hay ninguna campaña abierta.
 *
 * Este es el estado del sitio once meses al año, y hasta ahora era el peor:
 * una lista de campañas cerradas, todas diciendo "no conviene transferir
 * desde acá", sin nada más. Alguien que llega queriendo ayudar se va sin
 * poder hacer nada.
 *
 * La respuesta no es inventar una emergencia ni dejar abierta una colecta
 * terminada. Es decir en voz alta que no hay ninguna activa —que es una
 * buena noticia— y ofrecer lo que sí sirve mientras tanto. Las tres cosas
 * de acá abajo no dependen de que exista una catástrofe y no piden plata
 * en nombre de nadie.
 */

const OPCIONES = [
  {
    icono: Megaphone,
    titulo: "Difundilo antes de que haga falta",
    texto:
      "Cuando hay una emergencia, la información circula en horas y la gente busca a las apuradas. Que este sitio ya exista en la cabeza de alguien vale más que cualquier campaña de último momento.",
  },
  {
    icono: PlusCircle,
    titulo: "Contanos de una organización",
    texto:
      "Bomberos voluntarios, brigadas y espacios comunitarios trabajan todo el año, no sólo durante el fuego. Si conocés uno que reciba aportes, lo chequeamos y queda listo para la próxima.",
    accion: {
      texto: "Sumar una organización",
      href: `mailto:${brand.contactEmail}?subject=Sumar una organización`,
    },
  },
  {
    icono: Send,
    titulo: "Pedí una instancia",
    texto:
      "Si estás organizando la respuesta a una catástrofe en otro lugar, abrimos una instancia con tus organizaciones. El código es abierto y también podés desplegarlo por tu cuenta.",
    accion: {
      texto: "Solicitar una instancia",
      href: `mailto:${brand.contactEmail}?subject=Solicitar una instancia`,
    },
  },
];

export function LatentNotice() {
  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-col gap-3">
        <p className="eyebrow">Estado</p>
        <h2 className="heading-2">
          Ahora mismo no hay ninguna campaña <b>abierta</b>.
        </h2>
        <p style={{ color: "var(--text-muted)" }}>
          Es una buena noticia. Las campañas de abajo quedan publicadas como
          registro de lo que pasó, pero no invitan a transferir: nadie está
          verificando hoy que esas cuentas sigan activas, y mandar plata a una
          colecta terminada no ayuda a nadie.
        </p>
        <p style={{ color: "var(--text-muted)" }}>
          Cuando haya una emergencia, acá va a estar el listado chequeado.
          Mientras tanto hay tres cosas que sirven más de lo que parecen.
        </p>
      </div>

      <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
        {OPCIONES.map((o) => {
          const Icono = o.icono;
          return (
            <li key={o.titulo} className="card flex h-full flex-col gap-3">
              <Icono
                size={24}
                strokeWidth={1.75}
                aria-hidden
                style={{ color: "var(--text-faint)" }}
              />
              <h3 className="heading-3">{o.titulo}</h3>
              <p className="grow" style={{ color: "var(--text-muted)" }}>
                {o.texto}
              </p>
              {o.accion && (
                <a
                  href={o.accion.href}
                  className="btn btn-secondary btn-sm self-start"
                >
                  {o.accion.texto}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
