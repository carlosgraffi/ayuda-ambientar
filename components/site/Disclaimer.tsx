import { brand } from "@/lib/brand";

/**
 * En producción esto es `bg-yellow-50 border-l-4 border-yellow-400` y está
 * colapsado por defecto, así que hay que abrirlo para enterarse de qué
 * dice. Dos problemas: el amarillo se lee como "advertencia" cuando el
 * contenido es una aclaración de responsabilidad, y lo que aclara es
 * justamente lo que sostiene la confianza del sitio — esconderlo trabaja
 * en contra.
 *
 * Ahora: superficie neutra, la frase que importa visible sin desplegar, y
 * el resto en un `<details>` para quien quiera el detalle.
 */
export function Disclaimer() {
  return (
    <div className="card card-subtle flex flex-col gap-3">
      <p style={{ color: "var(--text-body)" }}>
        Este sitio compila información pública y no tiene relación con las
        organizaciones que lista. <strong>Las transferencias van directo a
        cada organización:</strong> acá no se recibe ni se administra un peso.
      </p>

      <details className="group">
        <summary
          className="cursor-pointer list-none text-sm font-medium underline underline-offset-4"
          style={{ color: "var(--text-link)" }}
        >
          Cómo se relevó esta información
        </summary>
        <div
          className="mt-3 flex flex-col gap-3 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          <p>
            Los datos se recopilaron de contenido compartido en redes sociales
            y de fuentes verificadas, en un proyecto independiente y sin fines
            de lucro. Aun así, ante una actualización o un cambio en los datos
            para donar, siempre conviene verificar la cuenta de Instagram o el
            sitio oficial de la organización antes de transferir.
          </p>
          <p>
            Si conocés una organización que debería estar en esta lista,{" "}
            <a href={`mailto:${brand.contactEmail}?subject=Sumar una organización`}>
              escribinos
            </a>{" "}
            y la cargamos una vez verificada su identidad.
          </p>
        </div>
      </details>
    </div>
  );
}
