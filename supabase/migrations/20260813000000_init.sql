-- ═══════════════════════════════════════════════════════════════════════
-- ayuda.ambient.ar · esquema inicial
--
-- Reemplaza a la colección `orgStats` de Firestore, que tenía dos
-- problemas: sus reglas permitían escribir desde el cliente —cualquiera
-- podía inflar los contadores— y no había forma de expresar "esta
-- organización está verificada por fulano, el 12/02, y esa verificación
-- vence". Eso último es el corazón del proyecto, no un extra.
--
-- Principios que ordenan el esquema:
--
-- 1. NADA se borra. Se archiva. Ante una denuncia de fraude hay que poder
--    reconstruir qué mostraba el sitio y cuándo.
-- 2. Lo público se lee sin autenticar, pero SÓLO lo publicado y verificado.
--    La web pública nunca escribe (salvo eventos anónimos de click).
-- 3. Cada fila cuelga de un tenant y las políticas filtran por membresía.
--    Un equipo no puede ver ni tocar los datos de otro.
-- ═══════════════════════════════════════════════════════════════════════

-- `gen_random_uuid()` es parte del núcleo de Postgres desde la 13, así que
-- no hace falta habilitar pgcrypto. Se evita además que la extensión se
-- cree en `public` cuando en un proyecto hospedado vive en `extensions`.

-- ── Tipos ──────────────────────────────────────────────────────────────
create type disaster_type as enum ('fuego', 'agua', 'viento');
create type emergency_status as enum ('activa', 'contencion', 'recuperacion', 'latente');
create type org_type as enum ('bomberos', 'brigada', 'viandas', 'familias', 'comunidad');

-- `no_declarado` es un estado de primera clase: la tarjeta lo dice en vez
-- de dejar el hueco. Es el dato más sensible contra el fraude.
create type holder_status as enum ('declarado', 'no_declarado', 'en_verificacion');

-- El flujo de una organización. `archivada` reemplaza al borrado.
create type org_status as enum ('borrador', 'en_revision', 'verificada', 'pausada', 'archivada');

create type link_kind as enum ('instagram', 'facebook', 'web', 'prensa', 'whatsapp', 'email');
create type need_kind as enum ('dinero', 'insumos', 'voluntariado', 'difusion');
create type hotspot_status as enum ('activo', 'contenido', 'extinguido');
create type member_role as enum ('lector', 'editor', 'admin');

-- Qué hizo la persona. No incluye "donó": la plata nunca pasa por acá, así
-- que no podemos saberlo y no vamos a insinuar que sí.
create type click_kind as enum ('copiar_alias', 'abrir_transferencia', 'compartir');

-- ── Campañas ───────────────────────────────────────────────────────────
-- Una fila es UNA CAMPAÑA: una catástrofe en un año. `campaign_key` agrupa
-- las ediciones de un mismo territorio (patagonia 2025 y 2026).
create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  campaign_key text not null,
  year int not null,
  name text not null,
  short_name text not null,
  headline text not null,
  lead text not null,
  disaster_type disaster_type not null,
  emergency_status emergency_status not null default 'activa',
  country_code text not null default 'AR',
  locale text not null default 'es-AR',
  hero_src text,
  hero_width int,
  hero_height int,
  -- Presente = cerrada. La página deja de invitar a transferir.
  closed_at timestamptz,
  -- Cuándo una PERSONA revisó el contenido por última vez. No es lo mismo
  -- que `updated_at`, que se mueve con cualquier escritura —un seed, una
  -- corrección de tipeo— y diría "revisado recién" sobre datos de hace un
  -- año. La frescura es la señal de confianza del sitio: tiene que
  -- afirmarla alguien, no un trigger.
  last_reviewed_at timestamptz not null default now(),
  -- Lo que se midió. `not_measured` explica lo que falta, porque cero y
  -- "no se midió" son cosas distintas y no pueden verse igual.
  results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_key, year)
);

create table tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  hostname text not null unique,
  is_primary boolean not null default false,
  verified_at timestamptz
);

-- ── Quién puede tocar qué ──────────────────────────────────────────────
create table memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role member_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- ── Organizaciones ─────────────────────────────────────────────────────
create table organizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  slug text not null,
  name text not null,
  type org_type not null,
  description text not null,
  holder_name text,
  holder_status holder_status not null default 'no_declarado',
  status org_status not null default 'borrador',
  urgent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug),
  -- Si dice que hay titular declarado, tiene que haber un nombre.
  constraint holder_declarado_tiene_nombre
    check (holder_status <> 'declarado' or holder_name is not null)
);

-- Un alias ya no es un string suelto atado a MercadoPago: es un canal con
-- su rail. Es lo que permite que una instancia colombiana use Nequi.
create table org_channels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  rail text not null,
  identifier text not null,
  holder_override text,
  position int not null default 0,
  verified_at timestamptz
);

-- Tipado, para que una nota de prensa no termine en el campo de Instagram
-- como pasaba con Bomberos de El Bolsón.
create table org_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  kind link_kind not null,
  url text not null,
  handle text,
  label text
);

-- Formas de colaborar que no son plata. Es la mitad del valor nuevo, y lo
-- que permite el filtro "quiero ayudar sin dinero".
create table org_needs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  kind need_kind not null,
  detail text,
  -- Sigue vigente fuera de la emergencia: alimenta "cómo colaborar todo
  -- el año", que es lo que hace que el sitio sirva los otros once meses.
  recurring boolean not null default false,
  active boolean not null default true
);

-- Por qué esto existe: si el sitio dice "verificada" y hay un fraude, la
-- responsabilidad es nuestra. Tiene que constar quién, cuándo y con qué.
create table org_verifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  verified_by uuid references auth.users(id),
  verified_at timestamptz not null default now(),
  method text not null,
  -- Ruta en storage privado. Puede tener datos personales: ver la nota de
  -- retención en DEPLOY.md antes de guardar nada acá.
  evidence_path text,
  notes text,
  -- Una verificación de hace ocho meses no es una verificación.
  expires_at timestamptz
);

create table hotspots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  status hotspot_status not null,
  -- NULL es "no reportado", que no es lo mismo que cero.
  hectares numeric,
  observed_at timestamptz,
  source text
);

create table campaign_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  organization text not null,
  description text not null,
  url text not null,
  cta text not null,
  tone text not null default 'informativo',
  starts_at timestamptz,
  ends_at timestamptz,
  position int not null default 0
);

-- ── Eventos ────────────────────────────────────────────────────────────
-- Anónimo a propósito: no hay identificador de persona, ni IP, ni cookie.
-- Sólo qué se tocó y cuándo. Alcanza para el resumen de una campaña y no
-- convierte a quien dona en un dato.
create table click_events (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  org_id uuid references organizations(id) on delete set null,
  kind click_kind not null,
  occurred_at timestamptz not null default now()
);

create index click_events_tenant_day
  on click_events (tenant_id, occurred_at desc);

-- Lo que lee el sitio: el detalle crudo no se expone nunca.
create view org_metrics_daily
with (security_invoker = true) as
  select tenant_id,
         org_id,
         date_trunc('day', occurred_at)::date as day,
         count(*) filter (where kind = 'copiar_alias') as copias,
         count(*) filter (where kind = 'abrir_transferencia') as transferencias,
         count(*) filter (where kind = 'compartir') as compartidas
  from click_events
  group by 1, 2, 3;

-- ── Auditoría ──────────────────────────────────────────────────────────
create table audit_log (
  id bigserial primary key,
  tenant_id uuid references tenants(id) on delete set null,
  actor uuid references auth.users(id),
  entity text not null,
  entity_id uuid,
  action text not null,
  diff jsonb,
  occurred_at timestamptz not null default now()
);

create table instance_requests (
  id uuid primary key default gen_random_uuid(),
  contact_name text not null,
  contact_email text not null,
  country_code text not null,
  disaster_type disaster_type not null,
  description text not null,
  status text not null default 'pendiente',
  created_at timestamptz not null default now()
);

-- ── `updated_at` que no se escribe a mano ──────────────────────────────
-- La fecha de actualización que muestra el sitio sale de acá. En el repo
-- viejo estaba escrita dentro del JSX y decía más de un año atrás.
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_touch before update on tenants
  for each row execute function touch_updated_at();
create trigger organizations_touch before update on organizations
  for each row execute function touch_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════════
alter table tenants enable row level security;
alter table tenant_domains enable row level security;
alter table memberships enable row level security;
alter table organizations enable row level security;
alter table org_channels enable row level security;
alter table org_links enable row level security;
alter table org_needs enable row level security;
alter table org_verifications enable row level security;
alter table hotspots enable row level security;
alter table campaign_links enable row level security;
alter table click_events enable row level security;
alter table audit_log enable row level security;
alter table instance_requests enable row level security;

-- `security definer` a propósito: si esta función respetara RLS, consultar
-- `memberships` dispararía la política de `memberships`, que a su vez
-- llamaría a esta función. Recursión infinita.
create or replace function es_miembro(t uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from memberships
    where tenant_id = t and user_id = auth.uid()
  );
$$;

create or replace function puede_editar(t uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from memberships
    where tenant_id = t and user_id = auth.uid()
      and role in ('editor', 'admin')
  );
$$;

-- ── Lectura pública ────────────────────────────────────────────────────
-- Las campañas y su contexto son públicos.
create policy tenants_lectura on tenants for select using (true);
create policy dominios_lectura on tenant_domains for select using (true);
create policy focos_lectura on hotspots for select using (true);
create policy campanias_lectura on campaign_links for select using (true);

-- Las organizaciones NO. Sólo las verificadas o pausadas: un borrador es
-- trabajo en curso y una archivada salió por algún motivo. Publicar un
-- alias sin verificar es exactamente el problema que este sitio existe
-- para resolver.
create policy orgs_lectura_publica on organizations for select
  using (status in ('verificada', 'pausada') or es_miembro(tenant_id));

-- Lo que cuelga de una organización hereda su visibilidad.
create policy canales_lectura on org_channels for select
  using (exists (
    select 1 from organizations o
    where o.id = org_id
      and (o.status in ('verificada', 'pausada') or es_miembro(o.tenant_id))
  ));

create policy enlaces_lectura on org_links for select
  using (exists (
    select 1 from organizations o
    where o.id = org_id
      and (o.status in ('verificada', 'pausada') or es_miembro(o.tenant_id))
  ));

create policy necesidades_lectura on org_needs for select
  using (exists (
    select 1 from organizations o
    where o.id = org_id
      and (o.status in ('verificada', 'pausada') or es_miembro(o.tenant_id))
  ));

-- Las verificaciones NO son públicas: pueden tener notas internas y
-- evidencia con datos personales. La tarjeta muestra la FECHA, que sale
-- por otro camino, no la evidencia.
create policy verificaciones_equipo on org_verifications for select
  using (exists (
    select 1 from organizations o
    where o.id = org_id and es_miembro(o.tenant_id)
  ));

-- ── Escritura del equipo ───────────────────────────────────────────────
create policy tenants_edicion on tenants for update using (puede_editar(id));
create policy focos_edicion on hotspots for all
  using (puede_editar(tenant_id)) with check (puede_editar(tenant_id));
create policy campanias_edicion on campaign_links for all
  using (puede_editar(tenant_id)) with check (puede_editar(tenant_id));
create policy orgs_edicion on organizations for all
  using (puede_editar(tenant_id)) with check (puede_editar(tenant_id));

create policy canales_edicion on org_channels for all
  using (exists (select 1 from organizations o where o.id = org_id and puede_editar(o.tenant_id)))
  with check (exists (select 1 from organizations o where o.id = org_id and puede_editar(o.tenant_id)));

create policy enlaces_edicion on org_links for all
  using (exists (select 1 from organizations o where o.id = org_id and puede_editar(o.tenant_id)))
  with check (exists (select 1 from organizations o where o.id = org_id and puede_editar(o.tenant_id)));

create policy necesidades_edicion on org_needs for all
  using (exists (select 1 from organizations o where o.id = org_id and puede_editar(o.tenant_id)))
  with check (exists (select 1 from organizations o where o.id = org_id and puede_editar(o.tenant_id)));

create policy verificaciones_edicion on org_verifications for insert
  with check (exists (select 1 from organizations o where o.id = org_id and puede_editar(o.tenant_id)));

create policy membresias_propias on memberships for select
  using (user_id = auth.uid() or es_miembro(tenant_id));

create policy auditoria_equipo on audit_log for select
  using (tenant_id is not null and es_miembro(tenant_id));

-- ── Eventos y solicitudes ──────────────────────────────────────────────
-- El público NO escribe eventos directamente: eso era justamente el
-- problema de Firestore, donde cualquiera podía inflar los contadores
-- desde la consola del navegador. Los inserta la Function del borde con
-- la service role, que no vive en el cliente.
create policy eventos_lectura_equipo on click_events for select
  using (es_miembro(tenant_id));

-- Las solicitudes de instancia sí se crean sin autenticar: es un
-- formulario público. Sólo insert, nunca lectura.
create policy solicitudes_alta on instance_requests for insert with check (true);

-- ═══════════════════════════════════════════════════════════════════════
-- Permisos de tabla
--
-- RLS decide QUÉ FILAS ve un rol, pero primero el rol tiene que tener
-- permiso sobre la tabla. Sin esto las políticas de arriba son correctas
-- y el sitio público igual sale vacío, sin ningún error visible.
--
-- `anon` es el visitante sin autenticar: sólo lectura, y sólo de lo que
-- las políticas dejan pasar. No puede insertar eventos — eso era
-- justamente el agujero de Firestore.
-- ═══════════════════════════════════════════════════════════════════════
grant usage on schema public to anon, authenticated;

grant select on
  tenants, tenant_domains, organizations, org_channels, org_links,
  org_needs, hotspots, campaign_links
to anon, authenticated;

grant select on org_verifications, memberships, audit_log, click_events,
  org_metrics_daily
to authenticated;

grant insert, update, delete on
  organizations, org_channels, org_links, org_needs, org_verifications,
  hotspots, campaign_links
to authenticated;

grant update on tenants to authenticated;

-- El formulario público de solicitud de instancia: sólo alta, sin lectura.
grant insert on instance_requests to anon, authenticated;

-- `service_role` saltea RLS, pero igual necesita permiso sobre las tablas.
-- Lo usan sólo el seed y la Function del borde que registra eventos; nunca
-- viaja al navegador.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant usage on schema public to service_role;
