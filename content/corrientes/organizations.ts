import type { Organization } from "@/lib/types";

/**
 * Organizaciones relevadas para los incendios de Corrientes (2025).
 *
 * Venían en el mismo archivo que las de Patagonia, separadas por un campo
 * `region`. Ahora la instancia ES la región, así que el campo desapareció
 * y cada una vive en su carpeta.
 */
export const organizations: Organization[] = [
  {
    slug: "corrientes-contra-el-cambio-climatico",
    name: "Corrientes contra el Cambio Climático",
    type: "comunidad",
    description:
      "Asociación sin fines de lucro para la lucha contra el cambio climático. Comunican el uso de las donaciones en su Instagram.",
    holderName: "Guido Paparella",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "correntinosclim.mp" }],
    links: [
      {
        kind: "instagram",
        handle: "@correntinosclim",
        url: "https://instagram.com/correntinosclim",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: true,
  },
  {
    slug: "bomberos-saladas",
    name: "Bomberos Voluntarios de Saladas",
    type: "bomberos",
    description: "Cuenta oficial de los Bomberos Voluntarios de Saladas.",
    holderName: "Asociación de Bomberos Voluntarios de Saladas",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "bomberos.saladas" }],
    links: [
      {
        kind: "instagram",
        handle: "@bomberosvoluntariossaladas",
        url: "https://instagram.com/bomberosvoluntariossaladas",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
  {
    slug: "bomberos-corrientes-capital",
    name: "Bomberos Voluntarios de Corrientes Capital",
    type: "bomberos",
    description:
      "Cuenta oficial de los Bomberos Voluntarios de Corrientes Capital.",
    holderName: "Asoc. Bomberos Voluntarios de Capital",
    holderStatus: "declarado",
    channels: [{ rail: "alias_ar", identifier: "granja.pluma.orilla" }],
    links: [
      {
        kind: "instagram",
        handle: "@bomberosvoluntariosctescap",
        url: "https://instagram.com/bomberosvoluntariosctescap",
      },
    ],
    needs: [{ kind: "dinero" }],
    urgent: false,
  },
];
