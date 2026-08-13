import { brand } from "./brand";

/** Formato numérico argentino: 48.389, no 48,389. */
export function num(value: number): string {
  return new Intl.NumberFormat(brand.locale).format(value);
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/**
 * "hace 4 meses". En un sitio al que la gente llega durante una
 * emergencia, la frescura es la señal de confianza — y una fecha absoluta
 * escrita a mano envejece sin que nadie se entere. El repo viejo mostraba
 * "Actualizado: 03/04/2025 06:03hs" en el JSX, más de un año atrás.
 *
 * Se calcula en el servidor, en el build: es un sitio estático y la fecha
 * de referencia es la del deploy.
 */
export function relativeTime(iso: string, now = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime();
  const abs = Math.abs(diff);
  // `numeric: "always"` a propósito: "auto" devuelve "el año pasado" o
  // "ayer", que no se pueden encajar en una oración de forma uniforme.
  // "hace 1 año" / "hace 4 meses" siempre compone igual.
  const rtf = new Intl.RelativeTimeFormat(brand.locale, { numeric: "always" });

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "recién";
}

/** Fecha completa, para el `dateTime` accesible del `<time>`. */
export function fullDate(iso: string): string {
  return new Intl.DateTimeFormat(brand.locale, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}
