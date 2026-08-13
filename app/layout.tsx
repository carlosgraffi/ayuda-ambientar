import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { brand, instance, siteUrl } from "@/lib/brand";
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

const title = `¿Cómo ayudar a las personas afectadas por los incendios en la Patagonia?`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s · ${instance.name}`,
  },
  description: brand.description,
  openGraph: {
    title,
    description: brand.description,
    locale: "es_AR",
    type: "website",
    siteName: instance.name,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

/**
 * Corre antes del primer paint para no mostrar el tema equivocado por un
 * instante. Fija también `data-disaster`, que es lo que selecciona la
 * paleta funcional del tipo de emergencia.
 */
const themeInit = `
(function(){
  var el = document.documentElement;
  el.setAttribute('data-disaster', ${JSON.stringify(instance.disasterType)});
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
