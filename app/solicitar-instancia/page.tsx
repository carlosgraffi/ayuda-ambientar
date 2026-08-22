import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { TopBar } from "@/components/site/TopBar";
import { RequestForm } from "@/components/site/RequestForm";

export const metadata: Metadata = {
  title: "Solicitar una instancia",
  description:
    "Si estás organizando la respuesta a una catástrofe, abrimos una instancia con tus organizaciones.",
  alternates: { canonical: `${brand.url}/solicitar-instancia/` },
};

export default function Page() {
  return (
    <>
      <TopBar />
      <main id="contenido" className="container section-tight">
        <div className="container-text flex flex-col gap-6">
          <div>
            <p className="eyebrow">Replicar esto</p>
            <h1 className="display-2 mt-3">
              Abrimos una instancia para tu <b>catástrofe</b>
            </h1>
          </div>

          <p className="lead">
            Si estás organizando la respuesta a una emergencia y te sirve un
            lugar donde estén todas las organizaciones con sus datos
            chequeados, lo abrimos. No cuesta nada.
          </p>

          <div className="card card-subtle flex flex-col gap-3">
            <p className="eyebrow">Qué te damos</p>
            <ul
              className="flex flex-col gap-2"
              style={{ color: "var(--text-muted)", paddingLeft: "1.1em" }}
            >
              <li>
                Una dirección propia dentro de {brand.name}, con tu listado de
                organizaciones y el titular de cada cuenta a la vista.
              </li>
              <li>
                Un panel para que tu equipo cargue y verifique organizaciones
                sin tocar código.
              </li>
              <li>
                El mapa de focos y las alertas oficiales de tu zona, si aplica.
              </li>
            </ul>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Lo que <b>no</b> hacemos, nunca, es recibir las donaciones. Las
              transferencias van directo de la persona a la organización. Si
              buscás algo que administre fondos, esto no es eso — y es a
              propósito.
            </p>
          </div>

          <RequestForm />

          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            También podés no pedirnos nada: el código es abierto y podés
            desplegarlo por tu cuenta. Está en{" "}
            <a
              href="https://github.com/carlosgraffi/ayuda-ambientar"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </main>
    </>
  );
}
