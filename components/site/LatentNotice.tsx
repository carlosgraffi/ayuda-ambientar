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
 *
 * El pre-registro va primero y con botón primario: es la única de las
 * tres que deja algo concreto listo para la temporada que viene, y el
 * momento de hacerlo es justamente cuando no está pasando nada.
 */

const OPCIONES: {
  icono: typeof Megaphone;
  titulo: string;
  texto: string;
  accion?: { texto: string; href: string; primaria?: boolean };
}[] = [
  {
    icono: PlusCircle,
    titulo: "Pre-registrá tu organización",
    texto:
      "Bomberos voluntarios, brigadas y espacios comunitarios trabajan todo el año, no sólo durante el fuego. Pre-registrarse lleva cinco minutos y deja los datos verificados antes de que empiece la temporada 2026–2027: prevenir es más fácil que correr después.",
    accion: { texto: "Pre-registrarla ahora", href: "/registrarse/", primaria: true },
  },
  {
    icono: Megaphone,
    titulo: "Difundilo antes de que haga falta",
    texto:
      "Cuando hay una emergencia, la información circula en horas y la gente busca a las apuradas. Que este sitio ya exista en la cabeza de alguien vale más que cualquier campaña de último momento.",
  },
  {
    icono: Send,
    titulo: "Pedí una instancia",
    texto:
      "Si estás organizando la respuesta a una catástrofe en otro lugar, abrimos una instancia con tus organizaciones. El código es abierto y también podés desplegarlo por tu cuenta.",
    accion: { texto: "Solicitar una instancia", href: "/solicitar-instancia/" },
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
          Y ese listado se arma ahora: cada organización que se pre-registra
          antes de la temporada 2026–2027 llega con sus datos ya verificados
          el día que se los necesita. Mientras tanto hay tres cosas que sirven más
          de lo que parecen.
        </p>
      </div>

      <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
        {OPCIONES.map((o) => {
          const Icono = o.icono;
          const destacada = o.accion?.primaria;
          return (
            <li
              key={o.titulo}
              className="card flex h-full flex-col gap-3"
              style={
                destacada
                  ? {
                      background: "var(--cta-soft)",
                      borderColor: "var(--cta-border)",
                    }
                  : undefined
              }
            >
              <Icono
                size={24}
                strokeWidth={1.75}
                aria-hidden
                style={{
                  color: o.accion?.primaria ? "var(--cta)" : "var(--text-faint)",
                }}
              />
              <h3 className="heading-3">{o.titulo}</h3>
              <p className="grow" style={{ color: "var(--text-muted)" }}>
                {o.texto}
              </p>
              {o.accion && (
                <a
                  href={o.accion.href}
                  className={`btn btn-sm self-start ${
                    o.accion.primaria ? "btn-cta" : "btn-secondary"
                  }`}
                >
                  {o.accion.texto}
                </a>
              )}
            </li>
          );
        })}
      </ul>

      {/* La duda que frena a una organización chica es cuánto sale. */}
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Registrar una organización y pedir una instancia es 100% gratis, al
        menos por ahora: los costos de mantenimiento los cubren{" "}
        <a href={brand.parentOrg.labUrl} target="_blank" rel="noopener noreferrer">
          {brand.parentOrg.lab}
        </a>{" "}
        y{" "}
        <a href={brand.parentOrg.url} target="_blank" rel="noopener noreferrer">
          {brand.parentOrg.name}
        </a>
        .
      </p>
    </div>
  );
}
