/**
 * Trae los focos activos de NASA FIRMS y los deja como GeoJSON estático en
 * `public/data/focos-<instancia>.geojson`. Corre en el build (`prebuild`).
 *
 * Por qué en el build y no por request:
 * · El sitio es un export estático servido desde CDN. Un pico de tráfico
 *   durante un incendio no puede multiplicar las llamadas a la NASA.
 * · La API key vive acá, en el entorno del build, y nunca llega al bundle.
 *   En el repo viejo estaba escrita en `FirmsMap.tsx`, o sea publicada.
 *
 * El precio es la frescura: los datos son de la última publicación, no de
 * ahora. La página lo dice con esas palabras en vez de aparentar tiempo
 * real. En F5 este mismo archivo lo escribe un cron de Cloudflare cada 10
 * minutos con datos geoestacionarios de GOES, y el contrato no cambia:
 * el mapa sigue leyendo un GeoJSON estático.
 *
 * Este script NUNCA falla el build. Si no hay key, si la API no responde o
 * si devuelve basura, escribe una colección vacía marcada `sin-senal` y el
 * mapa muestra ese estado, que es información y no un hueco.
 */
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Un recuadro por instancia. La lista vive en `content/regions.json`, que
 * también lee `lib/tenants.ts`: una sola fuente de verdad, en el único
 * formato que Node y TypeScript pueden leer sin herramientas de por medio.
 */
const REGIONS = JSON.parse(await readFile("content/regions.json", "utf8"));

const out = (slug) => `public/data/focos-${slug}.geojson`;

const SOURCE = "VIIRS_SNPP_NRT";
const DAYS = 3;

/** Descarta detecciones de baja confianza: sobre-reportar fuego no es neutral. */
const MIN_CONFIDENCE = "n"; // n = nominal, h = high; se descarta 'l' (low)

async function main() {
  const key = process.env.FIRMS_API_KEY;
  for (const [slug, bbox] of Object.entries(REGIONS)) {
    await fetchRegion(slug, bbox.join(","), key);
  }
}

async function fetchRegion(slug, BBOX, key) {
  const write = (doc) => writeDoc(slug, BBOX, doc);

  if (!key) {
    return write({
      status: "sin-senal",
      reason: "No se configuró FIRMS_API_KEY en el entorno del build.",
    });
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${SOURCE}/${BBOX}/${DAYS}`;

  let csv;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csv = await res.text();
  } catch (err) {
    return write({ status: "sin-senal", reason: `No respondió NASA FIRMS: ${err.message}` });
  }

  // La API devuelve texto plano cuando la key es inválida o se agotó la cuota.
  if (!csv.startsWith("country_id") && !csv.includes("latitude")) {
    return write({
      status: "sin-senal",
      reason: `NASA FIRMS respondió algo inesperado: ${csv.slice(0, 120).trim()}`,
    });
  }

  const [head, ...rows] = csv.trim().split("\n");
  const cols = head.split(",");
  const idx = (name) => cols.indexOf(name);
  const [iLat, iLon, iBright, iConf, iDate, iTime] = [
    "latitude",
    "longitude",
    "bright_ti4",
    "confidence",
    "acq_date",
    "acq_time",
  ].map(idx);

  const features = [];
  for (const row of rows) {
    const f = row.split(",");
    const lat = Number(f[iLat]);
    const lon = Number(f[iLon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const conf = (f[iConf] ?? "").trim().toLowerCase();
    if (MIN_CONFIDENCE === "n" && conf === "l") continue;

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        confidence: conf,
        brightness: Number(f[iBright]) || null,
        observedAt: `${f[iDate]}T${String(f[iTime] ?? "").padStart(4, "0")}Z`,
      },
    });
  }

  await write({
    status: features.length ? "ok" : "sin-detecciones",
    features,
  });
}

async function writeDoc(slug, BBOX, { status, features = [], reason }) {
  const doc = {
    type: "FeatureCollection",
    features,
    metadata: {
      status,
      reason,
      // Sin datos, `fetchedAt` sería una fecha que no respalda nada.
      fetchedAt: status === "ok" ? new Date().toISOString() : null,
      source: {
        name: "NASA FIRMS",
        product: `${SOURCE} · 375 m`,
        url: "https://firms.modaps.eosdis.nasa.gov/",
        license: "NASA Earthdata, uso libre con atribución",
      },
      windowDays: DAYS,
      bbox: BBOX.split(",").map(Number),
    },
  };
  const path = out(slug);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(doc));
  const detail = reason ? ` — ${reason}` : ` — ${features.length} focos`;
  console.log(`${path}: ${status}${detail}`);
}

await main();
