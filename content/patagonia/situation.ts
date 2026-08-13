import type { Campaign, Hotspot } from "@/lib/types";

/**
 * Estado de la emergencia en la Patagonia.
 *
 * En el repo viejo esto eran siete cajas `bg-gray-100` idénticas escritas
 * a mano dentro del JSX de `FireBrigadesApp.tsx`, donde 24.100 hectáreas y
 * 84 hectáreas se veían exactamente igual, y el total no aparecía en
 * ningún lado. En F4 sale del panel; por ahora, de acá.
 */
export const hotspots: Hotspot[] = [
  {
    name: "Parque Nacional Lanín (Valle Magdalena)",
    status: "contenido",
    hectares: 24100,
  },
  {
    name: "Parque Nacional Nahuel Huapi (Los Manzanos, El Manso y Cerro Meta)",
    status: "contenido",
    hectares: 11555,
  },
  { name: "Atilio Viglione", status: "contenido", hectares: 4900 },
  { name: "El Bolsón (Mallín Ahogado)", status: "contenido", hectares: 3800 },
  { name: "Epuyén", status: "contenido", hectares: 3500 },
  { name: "Caviahue", status: "extinguido", hectares: 450 },
  { name: "El Pedregoso", status: "extinguido", hectares: 84 },
];

/**
 * Fecha del último relevamiento del contenido de esta instancia. La barra
 * superior la muestra en relativo ("hace 4 meses"): en un sitio al que la
 * gente llega durante una emergencia, la frescura es la señal de
 * confianza, y una fecha escrita a mano envejece sin avisar.
 *
 * En F3 pasa a ser `max(updated_at)` de la base.
 */
export const lastReviewed = "2025-04-03T06:03:00-03:00";

/**
 * Campañas y repositorios de terceros.
 *
 * Antes eran seis banners con `border-l-4` en lima, naranja, rosa, azul,
 * azul e índigo, cada uno con su botón de su propio color, sin que nada
 * explicara por qué Don.ar era lima y AcercAR azul. Un solo tratamiento
 * para todos, y el tono es un token acotado en vez de un color libre.
 */
export const campaigns: Campaign[] = [
  {
    title: "Familias de Epuyén y Mallín Ahogado",
    organization: "Don.ar",
    description:
      "Relevan familias afectadas por los incendios junto a sus historias y nivel de daños, para facilitar la colecta. Cada caso tiene información para donar directamente a esa familia, y fueron relevados en persona por un equipo de voluntaries en el lugar.",
    url: "https://donar.lat/",
    cta: "Ver las familias",
    tone: "informativo",
  },
  {
    title: "Asociación Amigos de la Patagonia",
    organization: "aapatagonia.org.ar",
    description:
      "Organización sin fines de lucro fundada en 1999 en San Martín de los Andes. Se enfocan en proteger las viviendas y ayudar a los vecinos afectados por incendios.",
    url: "https://aapatagonia.org.ar/",
    cta: "Ir al sitio",
    tone: "informativo",
  },
  {
    title: "Asociación Civil AcercAR",
    organization: "Donar Online",
    description:
      "Espacio de investigación y acción social y ambiental surgido en 2020 en la Comarca Andina del Paralelo 42. Acompañan a quienes buscan generar un cambio en la comunidad.",
    url: "https://donaronline.org/asociacion-civil-acercar/apoya-a-el-bolson-en-la-emergencia-de-incendios",
    cta: "Donar",
    tone: "informativo",
  },
  {
    title: "Fundación Sí",
    organization: "Donar Online",
    description:
      "Intervienen ante cada catástrofe natural del país con asistencia inmediata, y colaboran para reequipar casas y reponer herramientas de trabajo perdidas.",
    url: "https://donaronline.org/fundacion-si/catastrofes-naturales-ayuda-a-las-familias-afectadas",
    cta: "Donar",
    tone: "informativo",
  },
  {
    title: "Tatuajes por la Patagonia",
    organization: "@tatuajesporlapatagonia",
    description:
      "Tatuadores de todo el país publican diseños solidarios a beneficio. Si tatuás y querés sumarte, publicá el tuyo y etiquetá a @nerdtattooer y a la cuenta de la campaña.",
    url: "https://www.instagram.com/tatuajesporlapatagonia/",
    cta: "Ver la campaña",
    tone: "informativo",
  },
  {
    title: "Repositorio de fuentes de La loca del taper",
    organization: "Dafna Nudelman",
    description:
      "Un espacio en Notion con información detallada y formas de ayudar, mantenido por Dafna Nudelman. Aceleró enormemente el relevamiento de las organizaciones que están en esta página.",
    url: "https://lalocadeltaper.notion.site/Patagonia-en-llamas-Quer-s-ayudar-19036713d8448053b780d27ea3b693c7",
    cta: "Abrir el repositorio",
    tone: "informativo",
  },
];
