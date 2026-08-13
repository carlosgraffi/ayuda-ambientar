import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { brand } from "@/lib/brand";
import "./globals.css";

/**
 * Bricolage Grotesque es la única familia del sistema. Variable, para que
 * el display en 300 y la palabra en 800 convivan en una sola descarga.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: {
    default: `${brand.name} · ¿Cómo ayudar ante una catástrofe?`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  openGraph: { locale: "es_AR", type: "website", siteName: brand.name },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

/**
 * Corre antes del primer paint para no mostrar el tema equivocado por un
 * instante. El tipo de desastre NO se fija acá: lo pone cada instancia en
 * su propio contenedor, que es lo que permite que un mismo deploy sirva
 * una instancia de fuego y una de agua.
 */
const themeInit = `
(function(){
  var el = document.documentElement;
  try {
    var saved = localStorage.getItem('theme');
    var dark = saved ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    el.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {
    el.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang={brand.locale}
      className={bricolage.variable}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
