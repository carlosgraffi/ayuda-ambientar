import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/lib/brand";
import { getTenant, getTenants } from "@/lib/content";
import { InstancePage } from "@/components/site/InstancePage";
import { canonicalUrl } from "@/lib/urls";

/** Una ruta estática por instancia. El export las emite todas en el build. */
export async function generateStaticParams() {
  return (await getTenants()).map((t) => ({ tenant: t.slug }));
}

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = await getTenant((await params).tenant);
  if (!tenant) return {};

  /**
   * Adelante lo que la gente escribe en el buscador — "incendios patagonia
   * 2025" — y no la pregunta retórica. `absolute` saltea la plantilla que
   * agrega la marca: con ella el título pasaba de 100 caracteres y Google
   * lo cortaba justo donde estaba lo útil.
   */
  const title = `${tenant.name} ${tenant.year} · Cómo ayudar y a quién donar`;
  return {
    title: { absolute: title },
    description: `${tenant.lead} ${brand.description}`,
    // La misma instancia es alcanzable por su dominio propio y por el path
    // de la plataforma. Sin canónica, los buscadores reparten el
    // posicionamiento entre las dos.
    alternates: { canonical: canonicalUrl(tenant) },
    openGraph: {
      title: tenant.headline.replace(/\*\*/g, ""),
      description: tenant.lead,
      url: canonicalUrl(tenant),
      locale: "es_AR",
      type: "website",
    },
  };
}

export default async function Page({ params }: Props) {
  const tenant = await getTenant((await params).tenant);
  if (!tenant) notFound();
  return <InstancePage tenant={tenant} />;
}
