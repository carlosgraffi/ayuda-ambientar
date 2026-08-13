import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/lib/brand";
import { TENANTS, getTenant } from "@/lib/tenants";
import { InstancePage } from "@/components/site/InstancePage";
import { canonicalUrl } from "@/lib/urls";

/** Una ruta estática por instancia. El export las emite todas en el build. */
export function generateStaticParams() {
  return TENANTS.map((t) => ({ tenant: t.slug }));
}

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = getTenant((await params).tenant);
  if (!tenant) return {};

  const title = tenant.headline.replace(/\*\*/g, "");
  return {
    title,
    description: `${tenant.lead} ${brand.description}`,
    // La misma instancia es alcanzable por su dominio propio y por el path
    // de la plataforma. Sin canónica, los buscadores reparten el
    // posicionamiento entre las dos.
    alternates: { canonical: canonicalUrl(tenant) },
    openGraph: {
      title,
      description: tenant.lead,
      url: canonicalUrl(tenant),
      locale: "es_AR",
      type: "website",
    },
  };
}

export default async function Page({ params }: Props) {
  const tenant = getTenant((await params).tenant);
  if (!tenant) notFound();
  return <InstancePage tenant={tenant} />;
}
