"use client";

import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { esDemo } from "@/lib/demo";

/**
 * Tours guiados del demo, por rol.
 *
 * Los pasos no se definen por cuenta sino por lo que la pantalla muestra:
 * cada panel del admin marca su bloque con `data-tour`, y el tour recorre
 * los que existan. Como qué bloques aparecen lo decide la base (RLS), el
 * tour de cada cuenta demo es automáticamente el de su rol — sin mantener
 * una lista de pasos por usuario que se desincronice.
 *
 * Sólo corre en modo demo: primer login auto, y un botón para relanzarlo.
 */

const PASOS: Record<string, { title: string; description: string }> = {
  verificacion: {
    title: "Qué te falta para publicarte",
    description:
      "Tu entidad no aparece en el sitio hasta tener dos avales o la verificación de una moderadora. Esta caja responde el porqué, siempre.",
  },
  necesidades: {
    title: "Necesidades en tres toques",
    description:
      "Elegí el ítem, tocá la urgencia, listo. Lo que marques aparece en tu perfil y en los filtros del listado — y muestra hace cuánto lo actualizaste.",
  },
  avales: {
    title: "Pedidos de aval",
    description:
      "Estas entidades te indicaron como referencia. Tu aval es público y sostiene su publicación: la línea de contexto es obligatoria a propósito.",
  },
  moderacion: {
    title: "Tu cola regional",
    description:
      "Sólo ves entidades y reportes de tus provincias — no porque la pantalla filtre, sino porque la base no te da otras filas. Checklist, decisión y motivo.",
  },
  wizard: {
    title: "Abrir una emergencia",
    description:
      "Tipo de desastre (fija paleta e insumos sugeridos), zona, y las entidades ya verificadas se activan en un paso. Menos de cinco minutos.",
  },
  solicitudes: {
    title: "Solicitudes de instancia",
    description:
      "Pedidos de otras regiones para abrir su propia instancia. La aprobación es siempre manual: acá la marca es la confianza.",
  },
};

export function DemoTour() {
  const [disponible, setDisponible] = useState(false);

  useEffect(() => {
    void esDemo().then(setDisponible);
  }, []);

  useEffect(() => {
    if (!disponible) return;
    // Primer login de esta cuenta en este navegador → tour automático.
    const t = setTimeout(() => {
      const clave = `tour-visto:${document.querySelectorAll("[data-tour]").length}`;
      if (!localStorage.getItem(clave) && document.querySelector("[data-tour]")) {
        localStorage.setItem(clave, "1");
        lanzar();
      }
    }, 900);
    return () => clearTimeout(t);
  }, [disponible]);

  function lanzar() {
    const bloques = [...document.querySelectorAll("[data-tour]")];
    const steps = bloques
      .map((el) => {
        const key = (el as HTMLElement).dataset.tour!;
        const paso = PASOS[key];
        return paso ? { element: el as HTMLElement, popover: paso } : null;
      })
      .filter(Boolean) as { element: HTMLElement; popover: (typeof PASOS)[string] }[];
    if (!steps.length) return;
    driver({
      steps,
      showProgress: true,
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Listo",
      progressText: "{{current}} de {{total}}",
    }).drive();
  }

  if (!disponible) return null;

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={lanzar}>
      Ver el tour
    </button>
  );
}
