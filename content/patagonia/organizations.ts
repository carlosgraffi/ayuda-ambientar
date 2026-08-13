import type { Organization } from "@/lib/types";

/**
 * Las 28 organizaciones relevadas para los incendios de la Patagonia y
 * Corrientes (2025), migradas desde `src/data/organizations.ts` del repo
 * viejo y normalizadas al modelo de `lib/types.ts`.
 *
 * Qué cambió en la migración, además de la forma:
 *
 * · `type` se clasificó a mano sobre los 28 registros. Antes esa
 *   información vivía dentro de la descripción y por eso no podía filtrar.
 * · Las 5 organizaciones sin titular declarado quedaron marcadas como
 *   `no_declarado` en vez de `null`, para que la tarjeta lo diga.
 * · Bomberos de El Bolsón tenía una nota de laizquierdadiario.com en el
 *   campo `Instagram`. Se reclasificó como enlace de prensa.
 * · Fundación Bomberos de Argentina tenía un `**` de markdown sin cerrar
 *   en la descripción.
 * · Varias colectas se difunden desde la cuenta personal de quien las
 *   organiza (@sofia.nemen, @mimo_micael). El enlace lo aclara en vez de
 *   hacerlo pasar por el perfil oficial de la organización.
 * · Las direcciones de correo para enviar comprobantes salieron de la
 *   descripción y pasaron a ser enlaces.
 *
 * `needs` sólo registra lo que la descripción original efectivamente dice.
 * No se completó por inferencia: es un sitio donde la gente transfiere
 * plata a partir de estos datos, y suponer qué necesita una organización
 * es inventar en su nombre. El resto lo cargan ellas desde el panel (F4).
 */
export const organizations: Organization[] = [
  {
    slug: "circuito-verde",
    name: "Circuito Verde",
    type: "comunidad",
    description:
      "Una asociación civil de San Carlos de Bariloche, enfocada en la educación ambiental, huertas comunitarias y restauración ecológica.",
    holderName: null,
    holderStatus: "no_declarado",
    channels: [{ rail: "alias_ar", identifier: "CircuitoVerdeBari" }],
    links: [
      {
        kind: "instagram",
        handle: "@circuito_verde",
        url: "https://instagram.com/circuito_verde",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
  {
    slug: "amigos-de-la-patagonia",
    name: "Amigos de la Patagonia",
    type: "comunidad",
    description:
      "Enfocados en proteger las viviendas y ayudar a los vecinos afectados por incendios. Gestionado por Sofi Nemen (@sofia.nemen) y Alan Schwer (@patagonia.film).",
    holderName: null,
    holderStatus: "no_declarado",
    channels: [{ rail: "alias_ar", identifier: "amigos.patagonia" }],
    links: [
      {
        kind: "instagram",
        handle: "@amigosdelapatagonia",
        url: "https://instagram.com/amigosdelapatagonia",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: true,
  },
  {
    slug: "brigada-andina",
    name: "Brigada Andina",
    type: "brigada",
    description:
      "Organización voluntaria que apoya en la lucha contra incendios en la Patagonia.",
    holderName: "Susana Silvia Nagami",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "abaco.blonda.caoba" }],
    links: [
      {
        kind: "instagram",
        handle: "@brigada_andina",
        url: "https://instagram.com/brigada_andina",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: true,
  },
  {
    slug: "brigada-forestal-mallin-ahogado",
    name: "Brigada Forestal Mallín Ahogado",
    type: "brigada",
    description:
      "Además de utilizar los fondos para el combate del fuego, se consumió la base de la Brigada.",
    holderName: "Natalia Dobranski",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "flanco.foco.fuego" }],
    links: [
      {
        kind: "instagram",
        handle: "@brigadaforestalmallin",
        url: "https://instagram.com/brigadaforestalmallin",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: true,
  },
  {
    slug: "huerta-amarantus",
    name: "Huerta Amarantus",
    type: "brigada",
    description: "Para la compra de mangueras para el combate del fuego.",
    holderName: "Ivan Belay Santo",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "lomo.fuerte.pera" }],
    links: [
      {
        kind: "instagram",
        handle: "@huerta.amarantus",
        url: "https://instagram.com/huerta.amarantus",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
  {
    slug: "cic",
    name: "CIC",
    type: "viandas",
    description: "Viandas y elementos necesarios para el combate del fuego.",
    holderName: null,
    holderStatus: "no_declarado",
    channels: [{ rail: "alias_ar", identifier: "cicporincendios2025" }],
    links: [
      {
        kind: "instagram",
        handle: "@cicprimavera",
        url: "https://instagram.com/cicprimavera",
      },
    ],
    needs: [{ kind: "dinero" }, { kind: "insumos" }],
    urgent: true,
  },
  {
    slug: "mercado-comunitario-paraje-entre-rios",
    name: "Mercado Comunitario Paraje Entre Ríos",
    type: "viandas",
    description: "Viandas y acopio de productos para lxs combatientxs.",
    holderName: "María Luz Amarfil",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "agua.patagonia" }],
    links: [],
    needs: [
      { kind: "dinero" },
      { kind: "insumos", detail: "Acopio de productos" },
    ],
    urgent: false,
  },
  {
    slug: "vecinal-paraje-entre-rios-1",
    name: "Vecinal Paraje Entre Ríos 1",
    type: "viandas",
    description: "Viandas y acopio de productos para lxs combatientxs.",
    holderName: "Nicolas Trigo",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "obrarconstruccion.mp" }],
    links: [
      {
        kind: "instagram",
        handle: "@vecinal.del.paraje",
        url: "https://instagram.com/vecinal.del.paraje",
      },
    ],
    needs: [
      { kind: "dinero" },
      { kind: "insumos", detail: "Acopio de productos" },
    ],
    urgent: false,
  },
  {
    slug: "vecinal-paraje-entre-rios-2",
    name: "Vecinal Paraje Entre Ríos 2",
    type: "viandas",
    description: "Viandas y acopio de productos para lxs combatientxs.",
    holderName: "Natalia Figueredo",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "cerro.baila.rio" }],
    links: [
      {
        kind: "instagram",
        handle: "@vecinal.del.paraje",
        url: "https://instagram.com/vecinal.del.paraje",
      },
    ],
    needs: [
      { kind: "dinero" },
      { kind: "insumos", detail: "Acopio de productos" },
    ],
    urgent: false,
  },
  {
    slug: "agrupacion-rojinegra",
    name: "Agrupación Rojinegra",
    type: "brigada",
    description: "Brigada y aporte a vecines.",
    holderName: "Javier Ishikawa",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "fervor.ruido.real" }],
    links: [],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
  {
    slug: "brigada-cuchara-y-barro",
    name: "Brigada Cuchara y Barro",
    type: "brigada",
    description: "Compra de materiales para el combate del fuego.",
    holderName: "Rodolfo García Nuñez",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "cuchara.y.barro" }],
    links: [
      {
        kind: "instagram",
        handle: "@cuchara_y_barro",
        url: "https://instagram.com/cuchara_y_barro",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
  {
    slug: "centro-cultural-galeano",
    name: "Centro Cultural Galeano",
    type: "comunidad",
    description: "Para la compra de equipos para el combate del fuego.",
    holderName: "María Emma Zapata",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "incendiomallin25.mp" }],
    links: [
      {
        kind: "instagram",
        handle: "@ccgaleano",
        url: "https://instagram.com/ccgaleano",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: true,
  },
  {
    slug: "cooperadora-ifdc-el-bolson",
    name: "Cooperadora del Instituto de Formación Docente Continua",
    type: "comunidad",
    description:
      "Asociación civil que recauda fondos para colaborar con los estudiantes que perdieron sus casas.",
    holderName: null,
    holderStatus: "no_declarado",
    channels: [{ rail: "alias_ar", identifier: "clip.pisada.duque" }],
    links: [
      {
        kind: "instagram",
        handle: "@ifdcelbolson",
        url: "https://instagram.com/ifdcelbolson",
      },
      {
        kind: "email",
        url: "mailto:cooperadorainfdcelbolson@gmail.com?subject=Incendio",
        label: "Enviar comprobante con asunto «Incendio»",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
  {
    slug: "bomberos-el-bolson",
    name: "Bomberos de El Bolsón",
    type: "bomberos",
    description:
      "A nombre de Asociación Bomberos Voluntarios. Recaudan fondos para comprar equipamiento, combustible, y otros elementos necesarios para enfrentar los incendios.",
    holderName: "Asoc. Bomberos Voluntarios",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "motor.tunel.pera" }],
    links: [
      {
        // En el repo viejo esta URL estaba en el campo `Instagram`.
        kind: "prensa",
        url: "https://www.laizquierdadiario.com/Solidaridad-desde-abajo-ante-los-incendios-en-el-Bolson-Como-ayudar",
        label: "Nota sobre la colecta",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: true,
  },
  {
    slug: "bomberos-epuyen",
    name: "Bomberos de Epuyén",
    type: "bomberos",
    description:
      "Lideran el combate contra incendios y necesitan apoyo para comprar gasolina, bombas, y otros elementos esenciales.",
    holderName: "Asociación de Bomberos Voluntarios de Epuyén",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "bomberosepuyen" }],
    links: [
      {
        kind: "instagram",
        handle: "@bomberos_epuyen",
        url: "https://instagram.com/bomberos_epuyen",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
  {
    slug: "bomberos-lago-puelo",
    name: "Bomberos Voluntarios de Lago Puelo",
    type: "bomberos",
    description:
      "Recaudan fondos para apoyar las labores de los bomberos y adquirir equipos necesarios para los incendios.",
    holderName: "Asociación de Bomberos Voluntarios Lago Puelo",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "bomberos-lago-puelo" }],
    links: [
      {
        kind: "instagram",
        handle: "@bomberos_lago_puelo",
        url: "https://instagram.com/bomberos_lago_puelo",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
  {
    slug: "brigada-azul-zafiro",
    name: "Brigada Autogestiva de Azul Zafiro Ecoespacio",
    type: "brigada",
    description: "Brigada voluntaria y autogestiva de Río Azul.",
    holderName: null,
    holderStatus: "no_declarado",
    channels: [{ rail: "alias_ar", identifier: "azulzafiro.brigada" }],
    links: [
      {
        kind: "instagram",
        handle: "@azulzafiro.ecoespacio",
        url: "https://instagram.com/azulzafiro.ecoespacio",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
  {
    slug: "universidad-nacional-rio-negro",
    name: "Universidad Nacional de Río Negro",
    type: "comunidad",
    description:
      "Fondo solidario para la compra de insumos fundamentales para combatientes y familias afectadas.",
    holderName: "Federico Juan Vercelli",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "solidaridad.unrn.mp" }],
    links: [
      {
        kind: "instagram",
        handle: "@unrionegro",
        url: "https://instagram.com/unrionegro",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
  {
    slug: "lihuen-cultural",
    name: "Lihuen Cultural",
    type: "comunidad",
    description:
      "Para colaborar con el estado de emergencia ígnea en Epuyén.",
    holderName: "María Magdalena Canteros y otros",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "saco.chita.desperto" }],
    links: [
      {
        kind: "instagram",
        handle: "@lihuencultural",
        url: "https://instagram.com/lihuencultural",
      },
      {
        kind: "email",
        url: "mailto:lihuenculturalepuyen@gmail.com",
        label: "Enviar comprobante",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
  {
    slug: "centro-cultural-antu-quillen",
    name: "Centro Cultural Antu Quillen",
    type: "comunidad",
    description:
      "Recibiendo donaciones para damnificados por los incendios en Mallín Ahogado y Epuyén.",
    holderName: "Asociación Civil Antu Quillen",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "antuquillen" }],
    links: [
      {
        kind: "instagram",
        handle: "@ccantuquillen",
        url: "https://instagram.com/ccantuquillen",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
  {
    slug: "la-casa-de-tokiko",
    name: "La Casa de Tokiko",
    type: "familias",
    description:
      "Para ayudar con la reconstrucción de la casa de Tokiko en El Bolsón.",
    holderName: "Yoshida, Tokiko",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "jovial.porte.ruedo" }],
    links: [
      {
        kind: "instagram",
        handle: "@sofia.nemen",
        url: "https://instagram.com/sofia.nemen",
        label: "Difunde la colecta",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
  {
    slug: "brigada-costa-azul",
    name: "Brigada Costa Azul",
    type: "brigada",
    description: "Para colaborar con la brigada.",
    holderName: "Sebastián Fernando Blanco",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "brigada.costa.azul2" }],
    links: [
      {
        kind: "instagram",
        handle: "@sofia.nemen",
        url: "https://instagram.com/sofia.nemen",
        label: "Difunde la colecta",
      },
      {
        kind: "email",
        url: "mailto:brigada.costa.azul@gmail.com",
        label: "Enviar comprobante",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: true,
  },
  {
    slug: "fundacion-bomberos-argentina",
    name: "Fundación Bomberos de Argentina",
    type: "bomberos",
    description:
      "Fundación de Bomberos de Argentina. También tienen disponible un botón en la sección «Donar» de MercadoPago.",
    holderName: "Fundación Bomberos de Argentina",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "bomberosfund" }],
    links: [
      {
        kind: "instagram",
        handle: "@bomberosfund",
        url: "https://instagram.com/bomberosfund",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: true,
  },
  {
    slug: "bomberos-melipal",
    name: "Bomberos Voluntarios de Melipal",
    type: "bomberos",
    description:
      "Para colaborar con los gastos de reparación del equipamiento de la brigada, que estuvo colaborando en los incendios en El Bolsón, Los Manzanos y Bariloche.",
    holderName: "Asociación Civil Bomberos Voluntarios Melipal",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "bomberosmelipal" }],
    links: [
      {
        kind: "instagram",
        handle: "@bomberos.melipal",
        url: "https://instagram.com/bomberos.melipal",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: true,
  },
  {
    slug: "colecta-eliana-ferraris",
    name: "Colecta para Eliana Ferraris",
    type: "familias",
    description:
      "Para colaborar con la familia de Eliana Ferraris y sus dos hijes, de Mallín Ahogado, que perdieron absolutamente todo en los incendios.",
    holderName: "Eliana Ferraris",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "elianaferrarismallin" }],
    links: [
      {
        kind: "instagram",
        handle: "@mimo_micael",
        url: "https://instagram.com/mimo_micael",
        label: "Difunde la colecta, con más información y fotos",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: true,
  }
];
