/**
 * Trae, en el build, lo que se sabe del riesgo ANTES de que haya fuego, y
 * lo deja en `public/data/riesgo-<campaña>.json`.
 *
 * Dos fuentes, y la distinción entre ellas es el punto de todo esto:
 *
 * · GDACS publica un nivel de alerta OFICIAL (verde/naranja/rojo). Se
 *   replica exacto, con su color y su nombre. No lo recalculamos ni lo
 *   rediseñamos: sería falsear un instrumento público.
 *
 * · Open-Meteo da condiciones meteorológicas: temperatura, humedad,
 *   viento, lluvia. Son CONDICIONES, no un índice de peligro. Se muestran
 *   como tales.
 *
 * Lo que NO hacemos: calcular un índice propio a partir de esas
 *   condiciones y presentarlo como si midiera algo. El índice oficial es
 *   el FWI de Copernicus, y su capa no se puede consultar por punto
 *   —el servidor responde `LayerNotDefined` a GetFeatureInfo—, así que se
 *   enlaza a su mapa en vez de inventar un número.
 *
 * Como el resto de los datos del build: nunca falla, y si una fuente no
 * responde lo dice en vez de dejar un hueco.
 */
import { writeFile, mkdir, readFile } from "node:fs/promises";

const REGIONS = JSON.parse(await readFile("content/regions.json", "utf8"));
const salida = (slug) => `public/data/riesgo-${slug}.json`;

/** Alertas oficiales de incendio que caen dentro del recuadro. */
async function alertasGdacs([oeste, sur, este, norte]) {
  const url =
    "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH" +
    "?eventlist=WF&alertlevel=Green;Orange;Red";
  const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`GDACS HTTP ${r.status}`);
  const doc = await r.json();

  return (doc.features ?? [])
    .filter((f) => {
      const c = f.geometry?.coordinates;
      if (!c) return false;
      return c[0] >= oeste && c[0] <= este && c[1] >= sur && c[1] <= norte;
    })
    .map((f) => ({
      nivel: f.properties.alertlevel,
      nombre: f.properties.name,
      pais: f.properties.country,
      desde: f.properties.fromdate,
      url: f.properties.url?.report ?? null,
    }));
}

/** Condiciones en el centro del recuadro. Nunca un índice. */
async function condiciones([oeste, sur, este, norte]) {
  const lat = (sur + norte) / 2;
  const lon = (oeste + este) / 2;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&daily=temperature_2m_max,relative_humidity_2m_min,wind_speed_10m_max,precipitation_sum" +
    "&forecast_days=3&timezone=auto";
  const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`Open-Meteo HTTP ${r.status}`);
  const d = await r.json();

  return d.daily.time.map((dia, i) => ({
    dia,
    tempMax: d.daily.temperature_2m_max[i],
    humedadMin: d.daily.relative_humidity_2m_min[i],
    vientoMax: d.daily.wind_speed_10m_max[i],
    lluvia: d.daily.precipitation_sum[i],
  }));
}

for (const [slug, bbox] of Object.entries(REGIONS)) {
  const doc = {
    generadoEn: new Date().toISOString(),
    bbox,
    alertas: null,
    condiciones: null,
    fallas: [],
    fuentes: {
      gdacs: {
        nombre: "GDACS",
        url: "https://www.gdacs.org/",
        nota: "Sistema de alerta de la Comisión Europea y la ONU. El nivel es suyo y se reproduce tal cual.",
      },
      openMeteo: {
        nombre: "Open-Meteo",
        url: "https://open-meteo.com/",
        nota: "Condiciones meteorológicas, no un índice de peligro.",
      },
      fwi: {
        nombre: "GWIS · Copernicus",
        url: "https://gwis.jrc.ec.europa.eu/apps/gwis_current_situation/",
        nota: "El índice oficial de peligro (Fire Weather Index).",
      },
    },
  };

  for (const [clave, fn] of [
    ["alertas", alertasGdacs],
    ["condiciones", condiciones],
  ]) {
    try {
      doc[clave] = await fn(bbox);
    } catch (err) {
      // Una fuente caída es información, no un motivo para romper el build.
      doc.fallas.push(`${clave}: ${err.message}`);
    }
  }

  await mkdir("public/data", { recursive: true });
  await writeFile(salida(slug), JSON.stringify(doc));
  console.log(
    `riesgo-${slug}.json: ${doc.alertas?.length ?? "?"} alertas · ` +
      `${doc.condiciones ? "condiciones ok" : "sin condiciones"}` +
      (doc.fallas.length ? ` · fallas: ${doc.fallas.join("; ")}` : ""),
  );
}
