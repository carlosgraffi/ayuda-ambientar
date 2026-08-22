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
2. Vinculá tu carpeta local con el proyecto. El *reference ID* está en
   Project Settings → General, y también es el subdominio de la URL
   (`https://<ref>.supabase.co`). Pide la contraseña de la base, la que
   pusiste al crear el proyecto:

```bash
npx supabase link --project-ref <tu-ref>
```

3. Creá las tablas. Esto aplica `supabase/migrations/` sobre el proyecto
   remoto — hasta que no corra, la base está vacía y el seed no tiene
   dónde escribir:

```bash
npx supabase db push
```

   *Si preferís no usar el CLI:* copiá el contenido de
   `supabase/migrations/20260813000000_init.sql` y pegalo en el **SQL
   Editor** del panel de Supabase. Hace exactamente lo mismo.

4. Sembrá el contenido actual:

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

## 8 · El panel

Vive en `/admin` del mismo sitio. No hay servidor aparte: el navegador
habla directo con Supabase y **las políticas de fila deciden qué puede
hacer cada quien**. Por eso una instancia nueva no necesita infraestructura
extra — se despliega el sitio y el panel viene adentro.

Que la clave anónima sea pública no es un descuido: sin sesión no se ve
nada privado, y con sesión sólo se ve y edita aquello donde hay membresía.
Está probado en `npm run test:rls`.

### Entrar la primera vez, sin depender del correo

En una instancia recién desplegada el correo todavía no funciona: falta
SMTP, y Supabase arranca con `Site URL` en `localhost`, así que el enlace
de acceso lleva a una página que no existe. Sin una segunda puerta, quien
despliega la instancia no puede entrar a la instancia que acaba de
desplegar.

Por eso el panel también acepta contraseña. Para arrancar:

1. Supabase → **Authentication → Users → Add user**, con tu correo, una
   contraseña y **Auto Confirm User** tildado.
2. En `/admin`, tocá **Entrar con contraseña**.

No es la vía para el equipo —para eso está el enlace, que no se comparte
por WhatsApp— sino la que permite empezar.

### Dar de alta a alguien

1. Supabase → **Authentication → Users → Add user**, con su correo.
2. Crear la membresía (SQL Editor), eligiendo `rol`: `admin`, `editor` o
   `lector`.

```sql
insert into memberships (user_id, tenant_id, role)
select u.id, t.id, 'editor'
from auth.users u, tenants t
where u.email = 'persona@ejemplo.org' and t.slug = 'patagonia-2026';
```

Sin membresía la persona entra pero no ve ninguna campaña, y el panel se
lo dice.

El ingreso es por enlace de un solo uso al correo: no hay contraseña que
compartir por WhatsApp, que es como se filtra el acceso en un equipo que
se arma en medio de una emergencia. Para que los correos salgan de verdad
hay que configurar SMTP en Supabase → Authentication → Emails; con el
servidor por defecto sólo llegan a direcciones del propio equipo y con
límite diario.

### El enlace tiene que volver al sitio, no a localhost

Supabase sólo respeta el destino que pide la aplicación si esa URL está en
su lista blanca. Si no está, **ignora el pedido y manda al Site URL**, que
de fábrica es `http://localhost:3000`. Por eso un enlace recién configurado
lleva a una página que no existe.

En **Supabase → Authentication → URL Configuration**:

- **Site URL**: `https://ayuda.ambient.ar`
- **Redirect URLs**, una por línea:
  - `https://ayuda.ambient.ar/**`
  - `https://ayudapatagonia.ar/**`
  - `http://localhost:3000/**` (para desarrollo)

Los `**` importan: sin ellos sólo se acepta la raíz exacta y el destino
real es `/admin/`.

### Redesplegar sin tocar el repositorio

Tres formas, de menos a más esfuerzo:

1. **El botón "Publicar cambios" del panel.** Es para lo que existe.
2. **`npm run publicar`** — dispara el mismo hook desde la terminal.
   Necesita `CF_DEPLOY_HOOK_URL` en `.env.local`, que no se versiona.
3. **Cloudflare → Deployments → Retry deployment**, en el menú de la
   última entrada. Sin configurar nada.

Lo que **no** conviene usar de rutina es `npm run deploy`: construye en tu
máquina y sube ese resultado directo, salteando git. Si tenés cambios sin
commitear, terminan publicados sin quedar registrados en ningún lado.

### Publicar los cambios

Guardar escribe en la base al instante, **pero el sitio público se
reconstruye aparte**: el contenido se lee en el build. El botón *Publicar
cambios* dispara ese rebuild.

Para que funcione hace falta el hook:

1. Cloudflare → **Settings → Builds → Deploy hooks → Add deploy hook**,
   rama `main`. Copiá la URL.
2. Guardala como **Secret** con el nombre `CF_DEPLOY_HOOK_URL`.

Sin eso el botón avisa que falta configurarlo, en vez de fallar en
silencio. El hook vive del lado del servidor a propósito: es una URL que
dispara builds y en el navegador cualquiera podría gastarlos.

### Verificaciones

No se puede pasar una organización a *Verificada* sin registrar cómo se
chequeó. Si el sitio afirma que una cuenta es de quien dice ser y hay un
fraude, tiene que constar quién lo verificó, cuándo y con qué.

Toda verificación **vence**. La lista ordena primero lo que no está
publicado y lo que tiene la verificación vencida, porque es lo que alguien
tiene que mirar; el alfabeto se ve más prolijo y esconde justo eso.

> Las 28 organizaciones sembradas quedaron como `verificada` porque el
> sitio viejo ya las publicaba, pero **ninguna tiene una verificación
> registrada detrás**. El panel las marca a todas como vencidas. No es un
> error: es el estado real, y hasta que alguien las chequee una por una el
> sitio está afirmando algo que nadie sostuvo.

## 9 · Riesgo antes del fuego

La sección "Antes del fuego" de cada campaña sale de dos fuentes que se
consultan en el build y quedan como JSON estático, igual que los focos.
Ninguna necesita clave.

| Fuente | Qué aporta | Cómo se muestra |
| --- | --- | --- |
| **GDACS** | Nivel de alerta oficial (verde / naranja / rojo) | **Se replica exacto**, con su color y su nombre. No se recalcula ni se rediseña: sería falsear un instrumento público. |
| **Open-Meteo** | Temperatura, humedad, viento, lluvia | Como **condiciones**, nunca como índice. |

Lo que deliberadamente **no** hace: calcular un índice de peligro propio a
partir de esas condiciones. Calor, sequedad y viento influyen, pero un
índice serio pesa muchas más cosas, y publicar una cuenta casera como si
midiera algo sería inventar un instrumento.

El índice oficial existe —el Fire Weather Index de Copernicus— pero su
capa **no se puede consultar por punto**: el servidor responde
`LayerNotDefined` a `GetFeatureInfo`. Por eso se enlaza su mapa en vez de
estimar un número. Si en algún momento publican un endpoint de valores, el
lugar donde entra es `scripts/fetch-riesgo.mjs`.

## 10 · Solicitudes de instancia

`/solicitar-instancia` es público y escribe en `instance_requests` con la
clave anónima. Las políticas permiten **insertar sin autenticar y no
permiten leer**: cualquiera puede dejar una solicitud, nadie puede ver las
de los demás, que traen nombre y correo de personas.

La bandeja aparece en `/admin`, sólo para quien administra la plataforma.
Para darte ese permiso:

```sql
insert into super_admins (user_id)
select id from auth.users where email = 'carlos.graffi@gmail.com';
```

### Abrir la instancia

**A propósito no se hace desde el panel.** Es un acto raro y de
consecuencias grandes: una instancia publica alias de transferencia con
este diseño detrás, y si alguien la usa para estafar el daño no es sólo
suyo. Se hace deliberadamente, después de hablar con quien la pidió, con
los pasos de la sección 5.

La aprobación manual no es una limitación temporal hasta automatizarla: es
la decisión. El autoservicio abierto es superficie de fraude, y acá la
marca **es** la confianza.

## Probar el enrutado por dominio antes de desplegar

`npm run dev` no ejecuta las Functions. Para probarlas hace falta el build
real:

```bash
npm run build && npx wrangler pages dev out --port 8799
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: ayudapatagonia.ar" http://localhost:8799/
```
