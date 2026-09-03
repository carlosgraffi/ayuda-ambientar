-- ═══════════════════════════════════════════════════════════════════════
-- v2 · Verificación distribuida, necesidades en vivo y eventos
--
-- Hasta acá, toda organización la cargaba y verificaba el administrador
-- único. Ese cuello de botella es lo que esta migración desarma:
--
-- · Las entidades se AUTO-REGISTRAN (owner_user_id) y quedan en nivel 0,
--   que NUNCA se publica. Se mantiene el principio del repo: una
--   organización sin verificar no aparece en el sitio, ni en la API, ni
--   en el widget.
-- · Una red de AVALES entre entidades sube automáticamente a nivel 1.
-- · MODERADORES REGIONALES completan el checklist (titularidad, registro,
--   huella pública) y suben a nivel 2. Sólo personas suben a 2; el
--   sistema solo llega a 1.
-- · Las entidades son PERMANENTES y se ACTIVAN en eventos: al cerrar una
--   campaña vuelven al directorio sin perder su verificación.
-- · Las NECESIDADES (económicas + insumos de un catálogo) las mantiene
--   cada entidad, con frescura visible.
--
-- Regla transversal, la misma de siempre: ningún rol intermedio puede
-- auto-elevarse. El owner no puede tocar su propio nivel; el que avala no
-- aprueba; el que aprueba no designa moderadores. Y todo queda en el log.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Taxonomía de desastres ─────────────────────────────────────────────
-- Editable por superadmin. `palette` mapea al color funcional del design
-- system (fuego/agua/viento): un tipo nuevo elige paleta entre las tres,
-- no inventa colores. NULL = acento tinta (el default del sistema).
create table disaster_types (
  key text primary key,
  name text not null,
  icon text not null default 'alert-triangle',
  palette disaster_type,
  position int not null default 0
);

insert into disaster_types (key, name, icon, palette, position) values
  ('incendio_forestal', 'Incendio forestal', 'flame', 'fuego', 1),
  ('inundacion', 'Inundación', 'droplet', 'agua', 2),
  ('terremoto', 'Terremoto / sismo', 'activity', 'viento', 3),
  ('alud', 'Alud / deslizamiento', 'mountain', 'viento', 4),
  ('erupcion', 'Erupción / caída de cenizas', 'triangle', 'fuego', 5),
  ('temporal', 'Temporal / viento / granizo', 'wind', 'viento', 6),
  ('sequia', 'Sequía / ola de calor', 'sun', 'fuego', 7),
  ('otra', 'Otra emergencia ambiental', 'alert-triangle', null, 8);

-- ── Catálogo de insumos ────────────────────────────────────────────────
create table supply_catalog (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  unit text,
  position int not null default 0,
  unique (category, name)
);

insert into supply_catalog (category, name, unit, position) values
  ('Agua e hidratación', 'Bidones de agua', 'bidón', 1),
  ('Agua e hidratación', 'Agua potable embotellada', 'litro', 2),
  ('Agua e hidratación', 'Sales de rehidratación', 'sobre', 3),
  ('Cuidado médico', 'Botiquines', 'unidad', 10),
  ('Cuidado médico', 'Gasas y vendas', 'paquete', 11),
  ('Cuidado médico', 'Guantes descartables', 'caja', 12),
  ('Cuidado médico', 'Barbijos N95', 'unidad', 13),
  ('Cuidado médico', 'Suero fisiológico', 'unidad', 14),
  ('Cuidado médico', 'Apósitos para quemaduras', 'unidad', 15),
  ('Equipamiento contra incendios', 'Motobombas', 'unidad', 20),
  ('Equipamiento contra incendios', 'Mangueras', 'tramo', 21),
  ('Equipamiento contra incendios', 'Mochilas forestales', 'unidad', 22),
  ('Equipamiento contra incendios', 'Palas', 'unidad', 23),
  ('Equipamiento contra incendios', 'Rastrillos McLeod', 'unidad', 24),
  ('Equipamiento contra incendios', 'Antiparras', 'unidad', 25),
  ('Equipamiento contra incendios', 'Linternas frontales', 'unidad', 26),
  ('Equipamiento ante inundaciones', 'Bombas de achique', 'unidad', 30),
  ('Equipamiento ante inundaciones', 'Botas de goma', 'par', 31),
  ('Equipamiento ante inundaciones', 'Lavandina', 'litro', 32),
  ('Indumentaria', 'Borcegos / calzado de trabajo', 'par', 40),
  ('Indumentaria', 'Guantes de trabajo', 'par', 41),
  ('Indumentaria', 'Camisas de grafa', 'unidad', 42),
  ('Indumentaria', 'Cascos', 'unidad', 43),
  ('Alimentos', 'Alimentos no perecederos', 'kg', 50),
  ('Alimentos', 'Alimento para animales', 'kg', 51),
  ('Refugio y abrigo', 'Frazadas', 'unidad', 60),
  ('Refugio y abrigo', 'Colchones', 'unidad', 61),
  ('Refugio y abrigo', 'Carpas', 'unidad', 62),
  ('Refugio y abrigo', 'Chapas', 'unidad', 63),
  ('Refugio y abrigo', 'Nylon', 'rollo', 64),
  ('Otros', 'Combustible', 'litro', 70),
  ('Otros', 'Forraje', 'fardo', 71),
  ('Otros', 'Pañales', 'paquete', 72),
  ('Otros', 'Artículos de higiene', 'unidad', 73);

-- Insumos sugeridos por tipo de desastre: preselección del wizard,
-- siempre editable al crear la instancia.
create table disaster_type_supplies (
  disaster_type_key text not null references disaster_types(key) on delete cascade,
  supply_id uuid not null references supply_catalog(id) on delete cascade,
  primary key (disaster_type_key, supply_id)
);

insert into disaster_type_supplies
select 'incendio_forestal', id from supply_catalog
 where name in ('Motobombas','Mangueras','Mochilas forestales','Antiparras',
                'Bidones de agua','Apósitos para quemaduras','Linternas frontales',
                'Palas','Rastrillos McLeod');
insert into disaster_type_supplies
select 'inundacion', id from supply_catalog
 where name in ('Bombas de achique','Botas de goma','Colchones','Frazadas',
                'Lavandina','Agua potable embotellada');
insert into disaster_type_supplies
select 'terremoto', id from supply_catalog
 where name in ('Carpas','Linternas frontales','Botiquines','Bidones de agua','Palas');
insert into disaster_type_supplies
select 'alud', id from supply_catalog
 where name in ('Palas','Frazadas','Bidones de agua','Guantes de trabajo');
insert into disaster_type_supplies
select 'erupcion', id from supply_catalog
 where name in ('Barbijos N95','Antiparras','Bidones de agua','Forraje');
insert into disaster_type_supplies
select 'temporal', id from supply_catalog
 where name in ('Chapas','Nylon','Frazadas');
insert into disaster_type_supplies
select 'sequia', id from supply_catalog
 where name in ('Bidones de agua','Forraje','Sales de rehidratación');

-- ── Entidades: del alta manual al auto-registro ────────────────────────
alter table organizations
  add column owner_user_id uuid references auth.users(id) on delete set null,
  -- 0 nunca se publica; 1 = avalada por la comunidad (automático);
  -- 2 = verificación completa (sólo un moderador la pone).
  add column verification_level int not null default 0
    check (verification_level between 0 and 2),
  add column is_validator boolean not null default false,
  add column province text,
  add column locality text,
  add column lat double precision,
  add column lng double precision,
  add column contact_email text,
  add column contact_phone text,
  -- Mensaje del moderador al owner (motivo de rechazo o pedido de info).
  add column moderation_note text;

-- Las entidades son permanentes: la campaña pasa a ser opcional.
alter table organizations alter column tenant_id drop not null;

-- El slug pasa a ser único GLOBAL. La unicidad por (tenant, slug) dejó de
-- servir dos veces: el perfil público vive en /e/<slug>, y con tenant_id
-- NULL el par ni siquiera restringe — en Postgres los NULL nunca chocan
-- entre sí, así que cada corrida de un seed podía duplicar entidades.
alter table organizations drop constraint organizations_tenant_id_slug_key;
alter table organizations add constraint organizations_slug_key unique (slug);

-- Las 28 organizaciones existentes fueron verificadas a mano una por una
-- durante 2025 (titular chequeado incluido): eso ES la verificación
-- completa, aunque hoy esté vencida — y el vencimiento ya se muestra.
update organizations set verification_level = 2
 where status in ('verificada', 'pausada');
update organizations set province = 'Río Negro'
 where tenant_id in (select id from tenants where campaign_key = 'patagonia');
update organizations set province = 'Corrientes'
 where tenant_id in (select id from tenants where campaign_key = 'corrientes');

-- ── Activaciones: entidad ⇄ evento ─────────────────────────────────────
create table event_activations (
  tenant_id uuid not null references tenants(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  activated_by uuid references auth.users(id),
  activated_at timestamptz not null default now(),
  auto boolean not null default false,
  primary key (tenant_id, org_id)
);

-- Backfill: lo que hoy cuelga de una campaña queda activado en ella.
insert into event_activations (tenant_id, org_id)
select tenant_id, id from organizations where tenant_id is not null;

-- ── Avales ─────────────────────────────────────────────────────────────
-- 'solicitado': la entidad nueva indicó que esta organización la conoce.
-- 'activo': el aval está dado y cuenta para el nivel.
-- 'en_revision': el avalista fue degradado; el aval no cuenta hasta que
--                un moderador lo confirme o lo revoque.
create type endorsement_status as enum
  ('solicitado', 'activo', 'ignorado', 'en_revision', 'revocado');

create table endorsements (
  id uuid primary key default gen_random_uuid(),
  endorser_org_id uuid not null references organizations(id) on delete cascade,
  endorsed_org_id uuid not null references organizations(id) on delete cascade,
  status endorsement_status not null default 'solicitado',
  context_note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (endorser_org_id, endorsed_org_id),
  check (endorser_org_id <> endorsed_org_id)
);

-- ── Checklist de verificación ──────────────────────────────────────────
create type check_type as enum ('titularidad', 'legal', 'registro', 'huella_publica');
create type check_result as enum ('ok', 'observado', 'pendiente');

create table verification_checks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  moderator_id uuid references auth.users(id),
  check_type check_type not null,
  result check_result not null default 'pendiente',
  evidence_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- ── Moderación regional ────────────────────────────────────────────────
create table moderator_regions (
  user_id uuid not null references auth.users(id) on delete cascade,
  province text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, province)
);

-- ── Reportes ───────────────────────────────────────────────────────────
create type report_reason as enum ('fraude', 'datos_incorrectos', 'inactiva', 'otro');
create type report_status as enum ('pendiente', 'validado', 'descartado');

create table reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  reason report_reason not null,
  detail text not null,
  reporter_contact text,
  status report_status not null default 'pendiente',
  handled_by uuid references auth.users(id),
  handled_note text,
  created_at timestamptz not null default now()
);

-- ── Necesidades en vivo ────────────────────────────────────────────────
create type need_urgency as enum ('urgente', 'se_necesita', 'cubierto');

alter table org_needs
  add column supply_id uuid references supply_catalog(id),
  add column urgency need_urgency not null default 'se_necesita',
  add column quantity_note text,
  add column delivery_note text,
  add column covered_at timestamptz,
  add column updated_at timestamptz not null default now();

-- La frescura de una necesidad la mueve la ENTIDAD, no cualquier proceso:
-- para usuarios finales el trigger pisa la fecha (como en el resto del
-- esquema), pero el seed y los procesos internos pueden fecharla — el
-- demo necesita mostrar una necesidad vieja con su badge de
-- "desactualizado", y eso es imposible si toda escritura la rejuvenece.
create or replace function touch_updated_at_usuario() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    new.updated_at = now();
  end if;
  return new;
end;
$$;
create trigger org_needs_touch before update on org_needs
  for each row execute function touch_updated_at_usuario();

-- Marcar cubierto guarda cuándo: el sitio lo muestra tachado 72 hs
-- ("ya no hace falta traer más") y después lo oculta.
create or replace function marcar_cubierto() returns trigger
language plpgsql as $$
begin
  if new.urgency = 'cubierto' and old.urgency <> 'cubierto' then
    new.covered_at = now();
  elsif new.urgency <> 'cubierto' then
    new.covered_at = null;
  end if;
  return new;
end;
$$;
create trigger org_needs_cubierto before update on org_needs
  for each row execute function marcar_cubierto();

-- ── Instancias: metadatos del wizard ───────────────────────────────────
alter table tenants
  add column disaster_type_key text references disaster_types(key),
  add column provinces text[] not null default '{}',
  add column localities text[] not null default '{}',
  add column official_links jsonb not null default '[]'::jsonb;

update tenants set disaster_type_key = 'incendio_forestal',
  provinces = case when campaign_key = 'patagonia'
                   then array['Río Negro','Chubut','Neuquén']
                   else array['Corrientes'] end;

-- Debounce de publicación: el rebuild se agrupa, no dispara por edición.
create table publish_state (
  id int primary key default 1 check (id = 1),
  last_triggered_at timestamptz
);
insert into publish_state (id) values (1);

-- ═══════════════════════════════════════════════════════════════════════
-- Funciones de autorización
-- ═══════════════════════════════════════════════════════════════════════

create or replace function es_moderador_de(p text) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from moderator_regions
    where user_id = auth.uid() and province = p
  ) or exists (select 1 from super_admins where user_id = auth.uid());
$$;

create or replace function es_moderador_de_org(org uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from organizations o
    join moderator_regions m on m.province = o.province
    where o.id = org and m.user_id = auth.uid()
  ) or exists (select 1 from super_admins where user_id = auth.uid());
$$;

create or replace function es_owner_de(org uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from organizations
    where id = org and owner_user_id = auth.uid()
  );
$$;

-- Visibilidad de una entidad, en un solo lugar: pública sólo si está
-- publicada Y tiene nivel ≥1. El nivel 0 lo ven el owner, su equipo de
-- campaña, los moderadores de su provincia y el superadmin.
create or replace function puede_ver_org(org uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from organizations o
    where o.id = org
      and (
        (o.status in ('verificada', 'pausada') and o.verification_level >= 1)
        or o.owner_user_id = auth.uid()
        or (o.tenant_id is not null and es_miembro(o.tenant_id))
        or es_moderador_de_org(o.id)
      )
  );
$$;

create or replace function puede_editar_org(org uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from organizations o
    where o.id = org
      and (
        o.owner_user_id = auth.uid()
        or (o.tenant_id is not null and puede_editar(o.tenant_id))
        or es_moderador_de_org(o.id)
      )
  );
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- Ningún rol se auto-eleva: el trigger que lo garantiza
--
-- RLS decide qué filas se tocan, pero no qué columnas. Sin esto, el owner
-- podría ponerse verification_level=2 con un UPDATE a su propia fila. El
-- trigger compara OLD y NEW: las columnas de confianza sólo las mueve un
-- moderador o el superadmin, y el estado del owner sólo puede ser
-- borrador o en_revision.
-- ═══════════════════════════════════════════════════════════════════════
create or replace function proteger_columnas_confianza() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  privilegiado boolean;
begin
  -- El seed y los procesos internos no pasan por acá.
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;

  -- Las elevaciones AUTOMÁTICAS (nivel 1 por avales, degradaciones) las
  -- ejecutan triggers en nombre de un usuario común: recalcular_nivel
  -- marca la sesión antes de tocar el nivel y la desmarca al salir. Sin
  -- esto, el aval que legítimamente sube una entidad a nivel 1 sería
  -- rechazado porque quien lo disparó no es moderador.
  if current_setting('app.sistema', true) = '1' then
    return new;
  end if;

  privilegiado := es_moderador_de_org(old.id);

  if not privilegiado then
    if new.verification_level is distinct from old.verification_level then
      raise exception 'solo un moderador puede cambiar el nivel de verificación';
    end if;
    if new.is_validator is distinct from old.is_validator then
      raise exception 'solo el superadmin habilita organizaciones validadoras';
    end if;
    -- El owner mueve su entidad entre borrador y en_revision; el equipo
    -- de campaña conserva el flujo completo que ya tenía.
    if new.status is distinct from old.status
       and not (old.tenant_id is not null and puede_editar(old.tenant_id))
       and new.status not in ('borrador', 'en_revision') then
      raise exception 'ese cambio de estado requiere un moderador';
    end if;
  end if;

  -- Habilitar validadora es del superadmin, no de cualquier moderador.
  if new.is_validator is distinct from old.is_validator
     and not exists (select 1 from super_admins where user_id = auth.uid()) then
    raise exception 'solo el superadmin habilita organizaciones validadoras';
  end if;

  -- Toda decisión de confianza deja constancia de quién la tomó. Las
  -- automáticas ya se registran en recalcular_nivel; éstas son las de
  -- personas, que son justamente las que más importa poder reconstruir.
  if new.verification_level is distinct from old.verification_level
     or new.status is distinct from old.status
     or new.is_validator is distinct from old.is_validator then
    insert into audit_log (tenant_id, actor, entity, entity_id, action, diff)
    values (old.tenant_id, auth.uid(), 'organizations', old.id, 'cambio_confianza',
            jsonb_build_object(
              'nivel', jsonb_build_array(old.verification_level, new.verification_level),
              'estado', jsonb_build_array(old.status, new.status),
              'validadora', jsonb_build_array(old.is_validator, new.is_validator)));
  end if;

  return new;
end;
$$;
create trigger organizations_confianza before update on organizations
  for each row execute function proteger_columnas_confianza();

-- ═══════════════════════════════════════════════════════════════════════
-- Nivel 1 automático por avales
--
-- Con ≥2 avales activos de organizaciones calificadas (validadoras o
-- nivel 2), o 1 aval + huella pública confirmada por moderador, una
-- entidad de nivel 0 sube sola a 1. La baja también es automática si los
-- avales dejan de valer — pero el nivel 2 nunca se toca solo: lo puso una
-- persona y lo baja una persona.
-- ═══════════════════════════════════════════════════════════════════════
create or replace function recalcular_nivel(org uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  avales int;
  huella boolean;
  actual int;
begin
  select verification_level into actual from organizations where id = org;
  if actual is null or actual = 2 then return; end if;

  select count(*) into avales
  from endorsements e
  join organizations avalista on avalista.id = e.endorser_org_id
  where e.endorsed_org_id = org
    and e.status = 'activo'
    and (avalista.is_validator or avalista.verification_level = 2);

  select exists (
    select 1 from verification_checks
    where org_id = org and check_type = 'huella_publica' and result = 'ok'
  ) into huella;

  perform set_config('app.sistema', '1', true);

  if avales >= 2 or (avales >= 1 and huella) then
    if actual = 0 then
      -- Nivel 1 publica: es el punto del aval comunitario. Si estaba en
      -- borrador o en revisión, pasa a publicada con badge amarillo.
      update organizations
         set verification_level = 1,
             status = case when status in ('borrador', 'en_revision')
                           then 'verificada'::org_status else status end
       where id = org;
      insert into audit_log (tenant_id, entity, entity_id, action, diff)
      select tenant_id, 'organizations', org, 'nivel_1_automatico',
             jsonb_build_object('avales', avales, 'huella', huella)
      from organizations where id = org;
    end if;
  elsif actual = 1 then
    update organizations set verification_level = 0 where id = org;
    insert into audit_log (tenant_id, entity, entity_id, action, diff)
    select tenant_id, 'organizations', org, 'nivel_1_perdido',
           jsonb_build_object('avales', avales, 'huella', huella)
    from organizations where id = org;
  end if;

  perform set_config('app.sistema', '0', true);
end;
$$;

create or replace function endorsements_recalcular() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform recalcular_nivel(coalesce(new.endorsed_org_id, old.endorsed_org_id));
  return coalesce(new, old);
end;
$$;
create trigger endorsements_nivel
  after insert or update or delete on endorsements
  for each row execute function endorsements_recalcular();

-- Si una validadora cae (pierde el nivel 2 o la condición de validadora),
-- sus avales emitidos pasan a revisión y los niveles que dependían de
-- ellos se recalculan.
create or replace function degradar_avales_emitidos() returns trigger
language plpgsql security definer set search_path = public as $$
declare afectada uuid;
begin
  if (old.verification_level = 2 and new.verification_level < 2)
     or (old.is_validator and not new.is_validator) then
    perform set_config('app.sistema', '1', true);
    update endorsements set status = 'en_revision', resolved_at = now()
    where endorser_org_id = new.id and status = 'activo';
    for afectada in
      select endorsed_org_id from endorsements where endorser_org_id = new.id
    loop
      perform recalcular_nivel(afectada);
    end loop;
    perform set_config('app.sistema', '0', true);
  end if;
  return new;
end;
$$;
create trigger organizations_degradacion after update on organizations
  for each row execute function degradar_avales_emitidos();

-- Una entidad pendiente puede pedir hasta 3 avales.
create or replace function limitar_solicitudes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'solicitado'
     and (select count(*) from endorsements
          where endorsed_org_id = new.endorsed_org_id) >= 3 then
    raise exception 'una entidad puede indicar hasta 3 organizaciones que la conocen';
  end if;
  return new;
end;
$$;
create trigger endorsements_limite before insert on endorsements
  for each row execute function limitar_solicitudes();

-- ═══════════════════════════════════════════════════════════════════════
-- Auto-activación en eventos
--
-- Cuando una entidad alcanza nivel ≥1, se activa sola en los eventos
-- abiertos de su provincia, marcada como automática para revisión
-- posterior del moderador. (Propuesto en el PRD; el moderador puede
-- desactivarla.)
-- ═══════════════════════════════════════════════════════════════════════
create or replace function auto_activar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.verification_level >= 1 and old.verification_level = 0
     and new.province is not null then
    insert into event_activations (tenant_id, org_id, auto)
    select t.id, new.id, true
    from tenants t
    where t.closed_at is null and new.province = any(t.provinces)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger organizations_auto_activar after update on organizations
  for each row execute function auto_activar();

-- ═══════════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════════
alter table disaster_types enable row level security;
alter table disaster_type_supplies enable row level security;
alter table supply_catalog enable row level security;
alter table event_activations enable row level security;
alter table endorsements enable row level security;
alter table verification_checks enable row level security;
alter table moderator_regions enable row level security;
alter table reports enable row level security;
alter table publish_state enable row level security;

-- Catálogos y taxonomía: públicos; los edita el superadmin.
create policy taxonomia_lectura on disaster_types for select using (true);
create policy taxonomia_gestion on disaster_types for all
  using (es_super_admin()) with check (es_super_admin());
create policy sugeridos_lectura on disaster_type_supplies for select using (true);
create policy sugeridos_gestion on disaster_type_supplies for all
  using (es_super_admin()) with check (es_super_admin());
create policy catalogo_lectura on supply_catalog for select using (true);
create policy catalogo_gestion on supply_catalog for all
  using (es_super_admin()) with check (es_super_admin());

-- Activaciones: públicas (el sitio lista entidades activadas por evento).
create policy activaciones_lectura on event_activations for select using (true);
-- El owner NO activa su propia entidad en un evento: lo hace el moderador
-- (o la auto-activación al subir de nivel, que revisa el moderador).
create policy activaciones_gestion on event_activations for all
  using (es_moderador_de_org(org_id)
         or (puede_editar_org(org_id) and not es_owner_de(org_id)))
  with check (es_moderador_de_org(org_id)
              or (puede_editar_org(org_id) and not es_owner_de(org_id)));

-- La visibilidad de organizaciones pasa a la regla nueva (nivel incluido).
drop policy orgs_lectura_publica on organizations;
create policy orgs_lectura on organizations for select
  using (
    (status in ('verificada', 'pausada') and verification_level >= 1)
    or owner_user_id = auth.uid()
    or (tenant_id is not null and es_miembro(tenant_id))
    or es_moderador_de_org(id)
  );

-- Auto-registro: cualquiera autenticado crea SU entidad, en nivel 0.
create policy orgs_autoregistro on organizations for insert
  with check (
    owner_user_id = auth.uid()
    and verification_level = 0
    and status in ('borrador', 'en_revision')
    and is_validator = false
  );

-- Edición: se suma el owner y el moderador regional. Las columnas de
-- confianza las protege el trigger, no esta política.
drop policy orgs_edicion on organizations;
create policy orgs_edicion on organizations for update
  using (puede_editar_org(id)) with check (puede_editar_org(id));
create policy orgs_alta_equipo on organizations for insert
  with check (tenant_id is not null and puede_editar(tenant_id));

-- Los hijos de la organización siguen su visibilidad.
drop policy canales_lectura on org_channels;
drop policy enlaces_lectura on org_links;
drop policy necesidades_lectura on org_needs;
create policy canales_lectura on org_channels for select using (puede_ver_org(org_id));
create policy enlaces_lectura on org_links for select using (puede_ver_org(org_id));
create policy necesidades_lectura on org_needs for select using (puede_ver_org(org_id));

drop policy canales_edicion on org_channels;
drop policy enlaces_edicion on org_links;
drop policy necesidades_edicion on org_needs;
create policy canales_edicion on org_channels for all
  using (puede_editar_org(org_id)) with check (puede_editar_org(org_id));
create policy enlaces_edicion on org_links for all
  using (puede_editar_org(org_id)) with check (puede_editar_org(org_id));
create policy necesidades_edicion on org_needs for all
  using (puede_editar_org(org_id)) with check (puede_editar_org(org_id));

-- Avales: públicos en el perfil ("quiénes la avalan" es parte del badge).
create policy avales_lectura on endorsements for select using (true);

-- Solicitar: el owner de la entidad avalada indica quién la conoce.
create policy avales_solicitud on endorsements for insert
  with check (
    (status = 'solicitado' and es_owner_de(endorsed_org_id))
    -- Aval directo y proactivo: el owner de una avalista calificada.
    or (status = 'activo' and es_owner_de(endorser_org_id)
        and exists (select 1 from organizations a
                    where a.id = endorser_org_id
                      and (a.is_validator or a.verification_level = 2)))
  );

-- Responder: el owner de la avalista (avalar/ignorar/revocar lo suyo);
-- el moderador puede revocar o poner en revisión.
create policy avales_respuesta on endorsements for update
  using (es_owner_de(endorser_org_id) or es_moderador_de_org(endorsed_org_id))
  with check (es_owner_de(endorser_org_id) or es_moderador_de_org(endorsed_org_id));

-- Checklist: lo escribe el moderador; el owner ve el suyo (sabe qué falta).
create policy checks_lectura on verification_checks for select
  using (es_owner_de(org_id) or es_moderador_de_org(org_id));
create policy checks_gestion on verification_checks for all
  using (es_moderador_de_org(org_id)) with check (es_moderador_de_org(org_id));

-- Regiones de moderación: el superadmin designa; cada quien ve la suya.
create policy moderadores_lectura on moderator_regions for select
  using (user_id = auth.uid() or es_super_admin());
create policy moderadores_gestion on moderator_regions for all
  using (es_super_admin()) with check (es_super_admin());

-- Reportes: cualquiera reporta (como las solicitudes: alta sin lectura);
-- los gestiona el moderador regional.
create policy reportes_alta on reports for insert with check (true);
create policy reportes_lectura on reports for select using (es_moderador_de_org(org_id));
create policy reportes_gestion on reports for update
  using (es_moderador_de_org(org_id)) with check (es_moderador_de_org(org_id));

-- El wizard también lo usan moderadores con permiso — por ahora, superadmin
-- (política tenants_alta ya existente). Los moderadores editan tenants de
-- sus provincias para activar/cerrar:
create policy tenants_moderacion on tenants for update
  using (exists (select 1 from moderator_regions m
                 where m.user_id = auth.uid() and m.province = any(provinces))
         or es_super_admin());

-- ── Permisos de tabla ──────────────────────────────────────────────────
grant select on disaster_types, disaster_type_supplies, supply_catalog,
  event_activations, endorsements to anon, authenticated;
grant select on verification_checks, moderator_regions, reports to authenticated;
grant insert on reports to anon, authenticated;
grant insert, update, delete on event_activations, endorsements,
  verification_checks, moderator_regions to authenticated;
grant update on reports to authenticated;
grant insert on organizations to authenticated;
grant all on disaster_types, disaster_type_supplies, supply_catalog to authenticated;
grant all on all tables in schema public to service_role;
