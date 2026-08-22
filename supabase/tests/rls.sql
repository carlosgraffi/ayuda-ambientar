-- Pruebas de RLS.
--
-- No son decorativas: las políticas de fila son el único mecanismo que
-- impide que el equipo de una campaña vea la de otra, y que un borrador
-- sin verificar aparezca en la web pública. Si fallan en silencio, el
-- sitio publica alias que nadie chequeó — el problema exacto que este
-- proyecto existe para resolver.
--
-- Se corren con: npm run test:rls
--
-- Todas las cuentas se acotan a las campañas de prueba (`norte`, `sur`):
-- la base puede tener contenido real sembrado y un conteo absoluto haría
-- que estas pruebas fallaran por el motivo equivocado.

begin;

-- ── Datos de prueba, como superusuario ────────────────────────────────
insert into auth.users (id, email, instance_id, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'ana@ejemplo.org',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'beto@ejemplo.org',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into tenants (id, slug, campaign_key, year, name, short_name, headline, lead, disaster_type)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'norte-2026', 'norte', 2026,
   'Incendios en el Norte', 'Norte', 'Cómo **ayudar**', 'Bajada.', 'fuego'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'sur-2026', 'sur', 2026,
   'Inundaciones en el Sur', 'Sur', 'Cómo **ayudar**', 'Bajada.', 'agua');

insert into memberships (user_id, tenant_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'editor'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0000-0000-0000-000000000002', 'editor');

insert into organizations (id, tenant_id, slug, name, type, description, holder_name, holder_status, status)
values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'bomberos-norte', 'Bomberos del Norte', 'bomberos', 'Descripción.',
   'Asoc. Bomberos', 'declarado', 'verificada'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   'sin-chequear', 'Colecta sin chequear', 'comunidad', 'Descripción.',
   null, 'no_declarado', 'borrador');

insert into org_channels (org_id, rail, identifier) values
  ('cccccccc-0000-0000-0000-000000000001', 'alias_ar', 'bomberos.norte'),
  ('cccccccc-0000-0000-0000-000000000002', 'alias_ar', 'alias.sin.chequear');

-- ═══ 1 · La web pública sólo ve lo verificado ═════════════════════════
set local role anon;

do $$
declare n int;
begin
  select count(*) into n from organizations
   where tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  assert n = 1, format('anon debería ver 1 organización verificada, ve %s', n);

  select count(*) into n from organizations where slug = 'sin-chequear';
  assert n = 0, 'un borrador sin verificar NO puede ser público';

  -- El alias de un borrador tampoco: es el dato que importa esconder.
  select count(*) into n from org_channels where identifier = 'alias.sin.chequear';
  assert n = 0, 'el alias de una organización sin verificar NO puede ser público';

  select count(*) into n from tenants where campaign_key in ('norte', 'sur');
  assert n = 2, format('las campañas sí son públicas, se ven %s de 2', n);
end $$;

-- ═══ 2 · El público no puede escribir eventos ════════════════════════
-- Esto es exactamente lo que fallaba en Firestore: las reglas permitían
-- escribir desde el cliente, así que cualquiera podía inflar un contador
-- desde la consola del navegador. Los eventos los inserta la Function del
-- borde con la clave de servicio, que nunca viaja al cliente.
do $$
begin
  begin
    insert into click_events (tenant_id, kind)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'copiar_alias');
    raise exception 'anon NO debería poder insertar eventos';
  exception
    when insufficient_privilege then null;
  end;
end $$;

do $$
begin
  -- Tampoco puede leer las verificaciones: tienen notas internas y
  -- evidencia con datos personales. Acá el corte es más duro que una
  -- política de filas: `anon` no tiene permiso sobre la tabla, así que
  -- ni siquiera llega a evaluarse qué filas vería.
  begin
    perform count(*) from org_verifications;
    raise exception 'anon NO debería poder leer verificaciones';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

-- ═══ 3 · Aislamiento entre campañas ══════════════════════════════════
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare n int;
begin
  -- Beto es del Sur: no puede ver el borrador del Norte.
  select count(*) into n from organizations where slug = 'sin-chequear';
  assert n = 0, 'un miembro de otra campaña NO puede ver borradores ajenos';

  -- Sí ve lo público, como cualquiera.
  select count(*) into n from organizations
   where tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  assert n = 1, format('debería ver sólo la verificada, ve %s', n);
end $$;

do $$
begin
  begin
    update organizations set name = 'Secuestrada'
    where id = 'cccccccc-0000-0000-0000-000000000001';
    if found then
      raise exception 'un miembro de otra campaña NO puede editar';
    end if;
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- ═══ 4 · El equipo propio sí ═════════════════════════════════════════
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from organizations
   where tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  assert n = 2, format('Ana debería ver las 2 de su campaña, ve %s', n);

  update organizations set name = 'Bomberos del Norte (revisado)'
  where id = 'cccccccc-0000-0000-0000-000000000001';

  select count(*) into n from organizations where name like '%revisado%';
  assert n = 1, 'el equipo propio sí puede editar';
end $$;

reset role;

-- ═══ 5 · Reglas del dato, no de los permisos ═════════════════════════
do $$
begin
  begin
    insert into organizations (tenant_id, slug, name, type, description, holder_status)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'incoherente', 'X',
            'comunidad', 'Y', 'declarado');
    raise exception 'no debería aceptarse titular declarado sin nombre';
  exception
    when check_violation then null;
  end;
end $$;

-- `updated_at` sale del trigger. Lo que se prueba es que NO se pueda
-- escribir a mano: la fecha de actualización que muestra el sitio es la
-- señal de confianza más importante, y en el repo viejo estaba escrita
-- dentro del JSX diciendo una fecha de más de un año atrás.
--
-- Nota: no se compara "antes < después" porque dentro de una transacción
-- `now()` no avanza. Se fuerza una fecha vieja y se comprueba que el
-- trigger la pisa igual.
do $$
declare quedo timestamptz;
begin
  update organizations
     set description = 'Otra descripción.',
         updated_at = '2001-01-01'
   where id = 'cccccccc-0000-0000-0000-000000000001';

  select updated_at into quedo from organizations
  where id = 'cccccccc-0000-0000-0000-000000000001';

  assert quedo = now(),
    format('el trigger debería pisar la fecha escrita a mano, quedó %s', quedo);
end $$;

-- ═══ 6 · Solicitudes de instancia ════════════════════════════════════
-- Traen nombre y correo de una persona: cualquiera puede DEJAR una, nadie
-- puede LEERLAS salvo quien administra la plataforma.
set local role anon;

do $$
begin
  insert into instance_requests (contact_name, contact_email, country_code,
                                 disaster_type, description)
  values ('Ana', 'ana@ejemplo.org', 'CO', 'fuego', 'Incendios en el Cauca.');
exception
  when others then raise exception 'anon SÍ debería poder dejar una solicitud: %', sqlerrm;
end $$;

do $$
begin
  begin
    perform count(*) from instance_requests;
    raise exception 'anon NO debería poder leer solicitudes';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

-- Un miembro común tampoco: no es lo mismo administrar una campaña que
-- administrar la plataforma.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from instance_requests;
  assert n = 0, format('un miembro común no debería ver solicitudes, ve %s', n);
end $$;

-- Y tampoco puede abrir instancias.
do $$
declare n int;
begin
  begin
    insert into tenants (slug, campaign_key, year, name, short_name, headline, lead, disaster_type)
    values ('trucha-2026','trucha',2026,'Trucha','Trucha','X','Y','fuego');
    raise exception 'un miembro común NO debería poder abrir una instancia';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

-- Con superadmin, sí.
insert into super_admins (user_id) values ('11111111-1111-1111-1111-111111111111');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from instance_requests;
  assert n >= 1, 'un superadmin sí debería ver las solicitudes';

  insert into tenants (slug, campaign_key, year, name, short_name, headline, lead, disaster_type)
  values ('cauca-2026','cauca',2026,'Incendios en el Cauca','Cauca','X','Y','fuego');
end $$;

reset role;

select 'Todas las pruebas de RLS pasaron' as resultado;

rollback;
