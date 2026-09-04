import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { TopBar } from "@/components/site/TopBar";
import { CopyField } from "@/components/site/CopyField";

/**
 * Cómo sostener la plataforma. No confundir con donar a las
 * organizaciones: eso es el corazón del sitio y nunca pasa por acá. Esto
 * es para los costos de mantenimiento, que hoy cubren ambient.ar y
 * Rediseñ.ar — y por eso el titular de la cuenta va a la vista, con la
 * misma vara que le pedimos a cada organización del directorio.
 */

export const metadata: Metadata = {
  title: "Aportar al proyecto",
  description:
    "El registro y las instancias son gratis. Si querés contribuir a que el proyecto siga activo, podés aportar mensualmente o por única vez.",
  alternates: { canonical: `${brand.url}/aportar/` },
};

const SUSCRIPCION_URL = "https://mpago.la/1eWkwwv";

export default function Page() {
  return (
    <>
      <TopBar />
      <main id="contenido" className="container section-tight">
        <div className="container-text flex flex-col gap-6">
          <div>
            <p className="eyebrow">Aportar</p>
            <h1 className="display-2 mt-3">
              Ayudá a que este proyecto siga <b>activo</b>
            </h1>
          </div>

          <p className="lead">
            Registrar una organización y pedir una instancia es 100% gratis:
            los costos de mantenimiento los cubren {brand.parentOrg.lab} y{" "}
            {brand.parentOrg.name}. Si querés sumar, todo aporte ayuda a
            sostener el servicio y el trabajo de verificación.
          </p>

          <div className="card flex flex-col gap-3">
            <p className="eyebrow">Aporte mensual</p>
            <p style={{ color: "var(--text-muted)" }}>
              Una suscripción por Mercado Pago, del monto que elijas. Se
              puede cancelar cuando quieras.
            </p>
            <a
              href={SUSCRIPCION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-mercadopago btn-md self-start"
            >
              Suscribirse por Mercado Pago
            </a>
          </div>

          <div className="card flex flex-col gap-3">
            <p className="eyebrow">Por única vez</p>
            <p style={{ color: "var(--text-muted)" }}>
              Una transferencia a través de Mercado Pago. Como en todo el
              sitio, el titular a la vista:
            </p>
            <CopyField label="Alias" value="carlosgff.mp" />
            <CopyField label="CVU" value="0000003100067541189353" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Titular: <b>Carlos Octavio Graffi</b>, responsable del proyecto
              en {brand.parentOrg.name}.
            </p>
          </div>

          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Esto no es una donación a las organizaciones del directorio: esas
            transferencias van siempre directo a cada organización, sin pasar
            por acá. Este aporte sostiene la plataforma.
          </p>
        </div>
      </main>
    </>
  );
}
