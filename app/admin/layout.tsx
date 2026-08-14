import type { Metadata } from "next";

/**
 * El panel no es secreto —la seguridad vive en las políticas de la base—
 * pero no tiene por qué aparecer en un buscador.
 */
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
