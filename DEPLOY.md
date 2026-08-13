# Desplegar en Cloudflare

Todo el sitio es estático salvo una Function chica que resuelve qué
instancia va en la raíz de cada dominio propio. Un pico de tráfico durante
una catástrofe pega contra el CDN, no contra un servidor, y Cloudflare no
cobra tráfico de salida.

## 1 · Crear el proyecto de Pages

```bash
npx wrangler login
```

```bash
FIRMS_API_KEY=<tu-key-nueva> npm run deploy
```

El primer deploy crea el proyecto `ayuda-ambientar` (el nombre está en
`wrangler.toml`) y devuelve una URL `*.pages.dev` para probar antes de
tocar ningún dominio.

## 2 · La API key de NASA FIRMS

La key de `FirmsMap.tsx` del repo viejo está publicada desde hace más de un
año: **rotala** en <https://firms.modaps.eosdis.nasa.gov/api/area/> y usá
la nueva. No va en el repo — se pasa como variable del build.

Si el proyecto se conecta a GitHub para que despliegue solo, la variable se
carga en el panel de Cloudflare:

**Workers & Pages → ayuda-ambientar → Settings → Variables and Secrets →
Add** — nombre `FIRMS_API_KEY`, tipo *Secret*, en el entorno *Production*
(y repetila en *Preview* si querés el mapa en las previsualizaciones).

Sin la key el build **no falla**: el mapa muestra el estado "sin señal".

## 3 · `ayuda.ambient.ar`

`ambient.ar` ya está en Cloudflare, así que el subdominio se agrega desde
el mismo panel:

1. **Workers & Pages → ayuda-ambientar → Custom domains → Set up a custom
   domain**.
2. Escribí `ayuda.ambient.ar` y confirmá.
3. Cloudflare crea el registro `CNAME ayuda → ayuda-ambientar.pages.dev`
   con el proxy activado (la nube naranja) y emite el certificado solo. No
   hay que tocar DNS a mano.
4. Tarda entre un minuto y un rato largo en pasar de *Initializing* a
   *Active*.

El certificado gratuito de Cloudflare cubre `ambient.ar` y `*.ambient.ar`
— un nivel. Por eso las instancias son rutas (`/patagonia`) y no
sub-subdominios: `patagonia.ayuda.ambient.ar` necesitaría Advanced
Certificate Manager.

## 4 · `ayudapatagonia.ar` (cuando quieras hacer el switch)

Hoy apunta al deploy viejo en Cloud Run. Antes de moverlo:

1. **Bajá el TTL** del registro actual a 60 segundos y esperá a que expire
   el TTL anterior. Con días de anticipación, no el mismo día.
2. Agregá `ayudapatagonia.ar` **y** `www.ayudapatagonia.ar` como custom
   domains del proyecto, igual que en el paso 3. Si el dominio todavía no
   está en tu cuenta de Cloudflare, primero agregalo como sitio y cambiá
   los nameservers en NIC.ar.
3. Verificá con `curl` antes de anunciar nada:

```bash
curl -sI https://ayudapatagonia.ar/ | head -1
```

Tiene que devolver `200`, no un redirect: la instancia se sirve por
reescritura y la URL que ve la gente no cambia.

```bash
curl -sI https://ayudapatagonia.ar/familias | grep -i location
```

Tiene que devolver un `301` a la raíz.

**El switch nunca va durante una emergencia activa.** Si hay una, se
posterga: el sitio viejo funciona. El rollback es revertir el DNS, así que
conviene dejar Cloud Run desplegado un mes más.

## 5 · Agregar una instancia nueva

Mientras el registro viva en el código (hasta F3), son tres pasos:

1. `content/<slug>/organizations.ts` con sus organizaciones.
2. Una entrada en `TENANTS` (`lib/tenants.ts`) — eligiendo `disasterType`,
   no colores, más `year` y `emergencyStatus`. Con `activa` o `contencion`
   la instancia sube al grupo "Ocurriendo ahora" de la portada.
3. Su recuadro en `content/regions.json`, si querés mapa de focos.

Queda en `ayuda.ambient.ar/<slug>`. Si además trae dominio propio, se
agrega a `hosts` y a `SLUG_POR_HOST` en `functions/_middleware.ts`, y el
dominio se da de alta como en el paso 3.

## Probar el enrutado por dominio antes de desplegar

`npm run dev` no ejecuta las Functions. Para probarlas hace falta el build
real:

```bash
npm run build && npx wrangler pages dev out --port 8799
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: ayudapatagonia.ar" http://localhost:8799/
```
