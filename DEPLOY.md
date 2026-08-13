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

El primer deploy crea el proyecto `ayuda-ambientar` y devuelve una URL
`*.pages.dev` para probar antes de tocar ningún dominio.

Con el repo conectado a GitHub esto ya no hace falta: cada push despliega
solo. En **Settings → Builds** el comando es `npm run build` y el
directorio de salida `out`.

### Por qué no hay `wrangler.toml`

Si el proyecto tiene uno, Cloudflare lo toma como fuente de verdad y el
panel deja de administrar las variables planas — sólo acepta Secrets. Eso
trae dos problemas para este proyecto:

· `[vars]` se commitea, y el repo es público. La clave de NASA FIRMS no
  puede volver a un archivo versionado: se rotó justamente porque estaba
  publicada.
· El archivo documenta bindings de *runtime*. Que sus variables lleguen al
  **build** no está documentado, y si no llegan el sitio no falla: cae en
  silencio al contenido de `content/` y nadie se entera.

Sin `wrangler.toml`, las cinco variables viven en el panel, que es donde
la documentación garantiza que el build las ve.

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

## 5 · Abrir una campaña nueva

Una instancia es **una campaña: una catástrofe en un año**. `patagonia-2025`
y `patagonia-2026` son dos, aunque hoy listen las mismas organizaciones.

Mientras el registro viva en el código (hasta F3):

1. `content/<campaña>/organizations.ts` con sus organizaciones, si el
   territorio es nuevo. Si es una edición más de un territorio ya
   relevado, reusá el mismo archivo.
2. Una entrada en `TENANTS` (`lib/tenants.ts`) con `slug: "<campaña>-<año>"`,
   el mismo `campaign` que sus ediciones anteriores, y `disasterType` —
   no colores. Con `activa` o `contencion` sube al grupo "Ocurriendo
   ahora" de la portada.
3. Su recuadro en `content/regions.json`, indexado por **campaña**, no por
   edición: el mapa es del territorio.
4. Si el territorio tiene dominio propio, **mové `SLUG_POR_HOST` en
   `functions/_middleware.ts` a la edición nueva.** Si te olvidás, el
   dominio sigue sirviendo la edición del año pasado, que además está
   cerrada y no invita a transferir.

## 6 · Cerrar una campaña

Poné `closedAt` con la fecha. Eso alcanza para que la página:

- muestre el aviso de campaña cerrada arriba de todo, con enlace a la
  edición vigente;
- **deje de ofrecer copiar el alias y transferir** — el dato queda como
  registro, pero ya no verificamos que esas cuentas sigan activas;
- oculte el mapa de focos activos, que sería fuego de hoy junto a datos de
  otro año;
- publique el resumen de resultados.

En `results` va lo que se haya medido. Lo que no se midió se declara en
`notMeasured` y se muestra tal cual: **cero y "no se midió" son cosas
distintas** y no pueden verse igual. Un cero donde falta instrumentación
convierte un problema nuestro en un dato sobre las organizaciones.

El flujo desde el panel — cerrar una campaña y generar el resumen sin
tocar código — es parte de F4.

## 7 · Supabase

El contenido vive en Supabase; `content/` queda como respaldo versionado.
**El build nunca depende de la base**: sin credenciales, o si no responde,
usa el contenido local y lo dice en el log. Esa es la forma definitiva, no
un puente — en una emergencia no se puede depender de un tercero para
poder publicar.

### Crear el proyecto

1. En <https://supabase.com/dashboard>, **New project**. Región: São Paulo
   (la más cercana). Guardá la contraseña de la base.
2. Conectá el repo y aplicá el esquema:

```bash
npx supabase link --project-ref <tu-ref>
```

```bash
npx supabase db push
```

3. Sembrá el contenido actual:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
```

Es idempotente: se puede correr las veces que haga falta.

### Las tres claves, y cuál va dónde

| Clave | Dónde | Por qué |
| --- | --- | --- |
| `SUPABASE_URL` | Build y Function | Pública. |
| `SUPABASE_ANON_KEY` | Build | Sólo lee, y RLS decide qué. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sólo** la Function y el seed | **Saltea RLS.** Si llega al navegador, cualquiera puede escribir en la base. |

En Cloudflare van en **Settings → Variables and Secrets**, la de servicio
como *Secret*. Nunca en el repo ni en un archivo que se despliegue.

### Por qué esto arregla lo de Firestore

Las reglas de Firestore permitían **escribir desde el navegador**: la app
vieja incrementaba los contadores desde el cliente, así que cualquiera
podía inflar un número desde la consola. Acá el navegador nunca toca la
base: manda un `POST` a `/api/track` y la Function inserta con la clave de
servicio, que vive en el Worker.

Las pruebas de `supabase/tests/rls.sql` verifican justamente eso, más el
aislamiento entre campañas y que un borrador sin verificar no salga a la
web. Se corren contra un stack local:

```bash
npx supabase start && npm run test:rls
```

### Firebase

Una vez sembrado y desplegado, **borrá el proyecto de Firebase**. Su única
función era el contador roto, y mientras exista sigue siendo una base
pública escribible con el nombre del proyecto a la vista.

## Probar el enrutado por dominio antes de desplegar

`npm run dev` no ejecuta las Functions. Para probarlas hace falta el build
real:

```bash
npm run build && npx wrangler pages dev out --port 8799
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: ayudapatagonia.ar" http://localhost:8799/
```
