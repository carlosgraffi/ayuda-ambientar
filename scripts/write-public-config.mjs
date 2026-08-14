/**
 * Escribe `public/config.json` con lo que el panel necesita saber para
 * hablar con Supabase desde el navegador.
 *
 * Por qué un archivo y no variables `NEXT_PUBLIC_*`: son exactamente los
 * mismos dos valores que ya usa el build, y duplicarlos con otro prefijo
 * significaría cuatro entradas en el panel de Cloudflare en vez de dos, y
 * la posibilidad de que se desincronicen sin que nadie lo note.
 *
 * Los dos valores son públicos por diseño. La clave anónima sólo permite
 * leer lo que las políticas dejan pasar, y para escribir hay que estar
 * autenticado y ser miembro de la campaña. La clave de servicio, que sí
 * saltea todo, no aparece acá ni puede aparecer: este archivo se sirve
 * como estático.
 */
import { writeFile, mkdir } from "node:fs/promises";

const config = {
  supabaseUrl: process.env.SUPABASE_URL ?? null,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? null,
};

await mkdir("public", { recursive: true });
await writeFile("public/config.json", JSON.stringify(config));

console.log(
  config.supabaseUrl
    ? "config.json: el panel puede conectarse"
    : "config.json: sin Supabase configurado — el panel va a decirlo",
);
