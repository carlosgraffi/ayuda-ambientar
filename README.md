# ayuda.ambient.ar

Organizaciones, brigadas y campañas que reciben donaciones ante
catástrofes, con sus datos chequeados a mano.

**Este sitio no recibe donaciones.** Las transferencias van directo de la
persona a la organización; acá no pasa ni un peso. Lo que centraliza es
*a quién donar*, que es lo que faltaba: ante una catástrofe la única forma
de juntar fondos suele ser compartir alias por historias de Instagram, y
eso se pierde en un día, no se puede verificar y abre la puerta al fraude.

Empezó como [AyudaPatagonia](https://ayudapatagonia.ar) durante los
incendios de 2025. Es un proyecto de [Rediseñ.ar](https://redisen.ar) en
el laboratorio [ambient.ar](https://ambient.ar).

## Cómo está pensado

Cada catástrofe es una **campaña**: un territorio en un año. Patagonia
2025 y Patagonia 2026 son dos, aunque listen las mismas organizaciones.
Todas se sirven desde un mismo despliegue, y la que tiene dominio propio
lo usa como canónico.

Tres decisiones ordenan el resto del código:

**El color dice qué desastre es, no qué hacer.** Naranja es fuego, azul es
agua: se reconoce la emergencia antes de leer el título. La consecuencia
es que ningún botón de acción puede ser naranja — los primarios van en
tinta. Una instancia nueva no elige colores, elige tipo de desastre.

**"Sin señal" es un estado, no un vacío.** Si no hay detecciones de fuego,
el mapa lo dice con todas las letras en vez de mostrar un cero: que no
haya reportes no significa que no haya fuego. Lo mismo con el titular de
una cuenta que no se declaró, y con las métricas de una campaña que no se
midieron. Cero y "no se midió" son cosas distintas.

**Nada que no se pueda sostener.** Una organización sin verificar no se
publica. Una campaña cerrada deja de ofrecer transferir, porque ya nadie
está chequeando que esas cuentas sigan activas. No se muestran números
que no describan lo que pasó.

## Correrlo

```bash
npm install && npm run dev
```

Sin más configuración usa el contenido versionado en `content/`. Para el
mapa de focos hace falta una clave gratuita de
[NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/area/):

```bash
FIRMS_API_KEY=<tu-clave> npm run build
```

Para trabajar contra la base, con Docker corriendo:

```bash
npx supabase start && npm run seed && npm run test:rls
```

## Cómo está armado

| | |
| --- | --- |
| `app/` | Rutas. `/` es la portada; `/[tenant]` cada campaña. Export estático. |
| `components/site/` | La página de campaña y sus partes. |
| `lib/tenants.ts` | El registro de campañas. Empezá por acá. |
| `lib/rails.ts` | Medios de transferencia por país. Agregar uno es agregar un archivo. |
| `content/` | El contenido versionado, que además es el respaldo del build. |
| `supabase/` | Esquema, políticas de acceso y sus pruebas. |
| `components/admin/` | El panel, en `/admin`. Cliente, contra Supabase. |
| `functions/` | Cloudflare: resolución de dominio propio, registro de interacciones y publicación. |
| `scripts/` | Descarga de focos en el build y siembra de la base. |

El sitio es estático y se sirve desde CDN: un pico de tráfico durante una
catástrofe no toca la base de datos. **El build tampoco depende de ella** —
sin credenciales usa `content/` y lo dice en el log. En una emergencia no
se puede depender de un tercero para poder publicar.

El despliegue, el alta de una campaña y su cierre están en
[DEPLOY.md](DEPLOY.md).

## Abrir una instancia propia

Si estás organizando la respuesta a una catástrofe y te sirve una
instancia, escribinos a carlos@redisen.ar. También podés forkear: el
código es abierto y las decisiones están explicadas en los comentarios,
que están en castellano a propósito.

## Diseño

Sobre el sistema de diseño de ambient.ar: una sola tipografía, números
grandes y tabulares, vidrio esmerilado sólo donde algo flota, y los
colores de Mercado Pago y WhatsApp reproducidos exactos porque en un botón
de donación el reconocimiento es toda la función.
