-- ═══════════════════════════════════════════════════════════════════════
-- Solicitudes de instancia
--
-- Alguien que está organizando la respuesta a una catástrofe pide que le
-- abramos una instancia. La aprobación es SIEMPRE manual: el autoservicio
-- abierto es superficie de fraude, y en este proyecto la marca es la
-- confianza. Lo que se automatiza es que la solicitud llegue ordenada y
-- quede a la vista, no la decisión.
-- ═══════════════════════════════════════════════════════════════════════

-- Quién puede ver las solicitudes y abrir instancias. Tabla y no un claim
-- en el token: así se otorga y se quita con una fila, sin tocar auth.
create table super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table super_admins enable row level security;

create or replace function es_super_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from super_admins where user_id = auth.uid());
$$;

create policy super_admins_se_ven on super_admins for select
  using (user_id = auth.uid());

-- Las solicitudes las lee y responde sólo quien administra la plataforma.
-- Traen nombre y correo de una persona: no son públicas.
create policy solicitudes_lectura on instance_requests for select
  using (es_super_admin());

create policy solicitudes_gestion on instance_requests for update
  using (es_super_admin()) with check (es_super_admin());

-- Abrir una instancia es un acto deliberado y raro. Sólo superadmin.
create policy tenants_alta on tenants for insert
  with check (es_super_admin());

grant select on super_admins to authenticated;
grant select, update on instance_requests to authenticated;
grant insert on tenants to authenticated;
