/**
 * Dispara una reconstrucción del sitio sin pasar por git.
 *
 *   npm run publicar
 *
 * Usa el mismo deploy hook que el botón del panel. Lee la URL de
 * `CF_DEPLOY_HOOK_URL` en el entorno o en `.env.local`, que está
 * gitignoreado: esa URL no lleva autenticación —quien la tiene puede
 * gastar builds— así que no puede vivir en el repositorio.
 */
import { readFile } from "node:fs/promises";

async function hook() {
  if (process.env.CF_DEPLOY_HOOK_URL) return process.env.CF_DEPLOY_HOOK_URL;
  try {
    const env = await readFile(".env.local", "utf8");
    return env.match(/^CF_DEPLOY_HOOK_URL=(.+)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}

const url = await hook();

if (!url) {
  console.error(
    [
      "Falta CF_DEPLOY_HOOK_URL.",
      "",
      "Es la misma URL que cargaste como Secret en Cloudflare. Copiala",
      "también a .env.local (que no se versiona) para poder usar este",
      "comando:",
      "",
      "  echo 'CF_DEPLOY_HOOK_URL=https://api.cloudflare.com/...' >> .env.local",
    ].join("\n"),
  );
  process.exit(1);
}

const r = await fetch(url, { method: "POST" });
console.log(
  r.ok
    ? "Build disparado. El sitio se actualiza en un par de minutos."
    : `Cloudflare respondió ${r.status}. Revisá que el hook siga existiendo.`,
);
process.exit(r.ok ? 0 : 1);
