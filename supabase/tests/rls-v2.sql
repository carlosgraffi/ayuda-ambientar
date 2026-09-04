-- Pruebas del núcleo de confianza v2.
--
-- Lo que estas pruebas garantizan es la regla central del PRD: ningún rol
-- se auto-eleva. El owner registra pero no se publica solo; los avales
-- suben a nivel 1 automáticamente pero el nivel 2 sólo lo pone una
-- persona; el moderador opera únicamente su región. Si algo de esto falla
-- en silencio, el sitio publica entidades que nadie sostuvo.
--
-- Se corren con: npm run test:rls

begin;

-- ── Fixtures (como superusuario) ──────────────────────────────────────
insert into auth.users (id, email, instance_id, aud, role) values
  ('d0000000-0000-0000-0000-000000000001', 'dueno@t.org',      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000001', 'avalista1@t.org',  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000002', 'avalista2@t.org',  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('e0000000-0000-0000-0000-000000000001', 'mod.chubut@t.org', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('e0000000-0000-0000-0000-000000000002', 'mod.salta@t.org',  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into moderator_regions (user_id, province) values
  ('e0000000-0000-0000-0000-000000000001', 'Chubut'),
  ('e0000000-0000-0000-0000-000000000002', 'Salta');

insert into tenants (id, slug, campaign_key, year, name, short_name, headline, lead,
                     disaster_type, disaster_type_key, provinces)
values ('f0000000-0000-0000-0000-000000000001', 'prueba-fuego-2026', 'prueba-fuego', 2026,
        'Incendio de prueba', 'Prueba', 'X', 'Y', 'fuego', 'incendio_forestal',
        array['Chubut']);

insert into organizations (id, tenant_id, slug, name, type, description,
                           holder_status, status, verification_level, is_validator,
                           province, owner_user_id)
values
  ('b0000000-0000-0000-0000-000000000001', null, 'avalista-uno', 'Brigada Avalista Uno',
   'brigada', 'X', 'no_declarado', 'verificada', 2, false, 'Chubut',
   'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', null, 'avalista-dos', 'ONG Avalista Dos',
   'brigada', 'X', 'no_declarado', 'verificada', 2, true, 'Chubut',
   'a0000000-0000-0000-0000-000000000002');

-- ═══ 1 · El auto-registro entra en nivel 0 y NO se publica ═══════════
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-0000-0000-000000000001","role":"authenticated"}';

insert into organizations (id, slug, name, type, description, holder_status,
                           status, province, locality, owner_user_id)
values ('c0000000-0000-0000-0000-000000000001', 'brigada-nueva', 'Brigada Nueva',
        'brigada', 'Recién registrada.', 'no_declarado', 'en_revision',
        'Chubut', 'Epuyén', 'd0000000-0000-0000-0000-000000000001');

reset role;
reset request.jwt.claims;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
declare n int;
begin
  select count(*) into n from organizations where slug = 'brigada-nueva';
  assert n = 0, 'una entidad nivel 0 NUNCA es pública';
end $$;
reset role;
reset request.jwt.claims;

-- ═══ 2 · El owner no puede auto-elevarse ═════════════════════════════
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-0000-0000-000000000001","role":"authenticated"}';

do $$
begin
  begin
    update organizations set verification_level = 2 where slug = 'brigada-nueva';
    raise exception 'el owner NO debería poder subirse el nivel';
  exception when others then
    if sqlerrm not like '%moderador%' then raise; end if;
  end;
  begin
    update organizations set status = 'verificada' where slug = 'brigada-nueva';
    raise exception 'el owner NO debería poder publicarse solo';
  exception when others then
    if sqlerrm not like '%moderador%' then raise; end if;
  end;
  -- Su perfil sí es suyo.
  update organizations set description = 'Brigada de Epuyén, formada en 2026.'
  where slug = 'brigada-nueva';
end $$;

-- ═══ 3 · Pide avales (hasta 3) ═══════════════════════════════════════
insert into endorsements (endorser_org_id, endorsed_org_id, status, created_by)
values ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
        'solicitado', 'd0000000-0000-0000-0000-000000000001'),
       ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
        'solicitado', 'd0000000-0000-0000-0000-000000000001');

-- Un pedido hecho por error se puede retirar mientras nadie respondió
-- (y libera cupo). Se borra y se vuelve a pedir para seguir la historia.
delete from endorsements
 where endorser_org_id = 'b0000000-0000-0000-0000-000000000002'
   and endorsed_org_id = 'c0000000-0000-0000-0000-000000000001';
do $$
declare n int;
begin
  select count(*) into n from endorsements
   where endorsed_org_id = 'c0000000-0000-0000-0000-000000000001';
  assert n = 1, 'el owner retira su propio pedido sin responder';
end $$;
insert into endorsements (endorser_org_id, endorsed_org_id, status, created_by)
values ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
        'solicitado', 'd0000000-0000-0000-0000-000000000001');

-- ═══ 4 · Un aval no alcanza; dos publican con nivel 1 ════════════════
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
update endorsements set status = 'activo',
       context_note = 'Trabajamos juntos en el incendio de El Bolsón 2025.'
 where endorser_org_id = 'b0000000-0000-0000-0000-000000000001';

-- La avalista SÍ ve la ficha de quien la nombró — aunque esté en nivel
-- 0: no se puede avalar (ni negarse con fundamento) a quien no se ve.
do $$
declare n int;
begin
  select count(*) into n from organizations where slug = 'brigada-nueva';
  assert n = 1, 'la avalista ve la ficha de la entidad que le pide aval';
end $$;

-- Pero es un permiso de la nombrada hacia la nombrada, no una ventana
-- general: la moderadora de OTRA región (sin pedido de por medio) no ve.
set local request.jwt.claims = '{"sub":"e0000000-0000-0000-0000-000000000002","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from organizations where slug = 'brigada-nueva';
  assert n = 0, 'sin pedido de aval de por medio, nivel 0 sigue invisible';
end $$;
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- La aserción de nivel corre como superusuario.
reset role;
reset request.jwt.claims;
do $$
declare n int;
begin
  select verification_level into n from organizations where slug = 'brigada-nueva';
  assert n = 0, format('con 1 aval sigue en nivel 0, está en %s', n);
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
update endorsements set status = 'activo', context_note = 'La conocemos de la red de brigadas.'
 where endorser_org_id = 'b0000000-0000-0000-0000-000000000002';

reset role;
reset request.jwt.claims;
do $$
declare n int; s org_status;
begin
  select verification_level, status into n, s from organizations where slug = 'brigada-nueva';
  assert n = 1, format('con 2 avales calificados sube sola a nivel 1, está en %s', n);
  assert s = 'verificada', 'nivel 1 publica: el badge amarillo es el punto del aval';
end $$;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
declare n int;
begin
  select count(*) into n from organizations where slug = 'brigada-nueva';
  assert n = 1, 'con nivel 1 ya es pública';
end $$;
reset role;
reset request.jwt.claims;

-- Un aval YA DADO no lo borra quien lo recibió: es una declaración de la
-- otra organización.
set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-0000-0000-000000000001","role":"authenticated"}';
delete from endorsements
 where endorsed_org_id = 'c0000000-0000-0000-0000-000000000001' and status = 'activo';
reset role;
reset request.jwt.claims;
do $$
declare n int;
begin
  select count(*) into n from endorsements
   where endorsed_org_id = 'c0000000-0000-0000-0000-000000000001' and status = 'activo';
  assert n = 2, 'un aval dado no se borra desde afuera';
end $$;

-- ═══ 5 · La auto-activación la metió en el evento de su provincia ════
do $$
declare esauto boolean;
begin
  select auto into esauto from event_activations
  where org_id = 'c0000000-0000-0000-0000-000000000001'
    and tenant_id = 'f0000000-0000-0000-0000-000000000001';
  assert esauto is true, 'al llegar a nivel 1 se auto-activa en el evento abierto de su provincia';
end $$;

-- ═══ 6 · Si el avalista cae, el nivel automático también ═════════════
update organizations set is_validator = false, verification_level = 1
 where id = 'b0000000-0000-0000-0000-000000000002';

do $$
declare n int; e endorsement_status;
begin
  select status into e from endorsements
   where endorser_org_id = 'b0000000-0000-0000-0000-000000000002';
  assert e = 'en_revision', 'los avales de una validadora degradada quedan en revisión';

  select verification_level into n from organizations where slug = 'brigada-nueva';
  assert n = 0, format('sin avales suficientes vuelve a nivel 0, está en %s', n);
end $$;

-- ═══ 7 · El moderador de OTRA región no puede tocarla ════════════════
set local role authenticated;
set local request.jwt.claims = '{"sub":"e0000000-0000-0000-0000-000000000002","role":"authenticated"}';
do $$
declare n int;
begin
  update organizations set moderation_note = 'intrusión'
   where slug = 'brigada-nueva';
  get diagnostics n = row_count;
  assert n = 0, 'un moderador de Salta no edita entidades de Chubut';
end $$;

-- ═══ 8 · El de su región completa el checklist y sube a nivel 2 ══════
set local request.jwt.claims = '{"sub":"e0000000-0000-0000-0000-000000000001","role":"authenticated"}';
insert into verification_checks (org_id, moderator_id, check_type, result, notes)
values ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
        'titularidad', 'ok', 'Constancia de CBU a nombre de la responsable.'),
       ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
        'registro', 'ok', 'Figura en el registro provincial de brigadas.');

update organizations set verification_level = 2, status = 'verificada'
 where slug = 'brigada-nueva';

reset role;
reset request.jwt.claims;
do $$
declare n int; quien uuid;
begin
  select verification_level into n from organizations where slug = 'brigada-nueva';
  assert n = 2, 'el nivel 2 lo pone el moderador de la región';

  select actor into quien from audit_log
   where action = 'cambio_confianza'
   order by occurred_at desc limit 1;
  assert quien = 'e0000000-0000-0000-0000-000000000001',
    'la decisión del moderador queda en el log, con su autor';
end $$;

-- El nivel 2 no se degrada solo: lo puso una persona.
update endorsements set status = 'revocado'
 where endorsed_org_id = 'c0000000-0000-0000-0000-000000000001';
do $$
declare n int;
begin
  select verification_level into n from organizations where slug = 'brigada-nueva';
  assert n = 2, 'perder avales no baja un nivel 2: eso es decisión humana';
end $$;

-- ═══ 9 · Reportes: cualquiera reporta, sólo el moderador regional lee ═
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into reports (org_id, reason, detail)
values ('c0000000-0000-0000-0000-000000000001', 'datos_incorrectos',
        'El alias publicado no coincide con el de sus redes.');
do $$
begin
  begin
    perform count(*) from reports;
    raise exception 'anon NO lee reportes';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
reset request.jwt.claims;

set local role authenticated;
set local request.jwt.claims = '{"sub":"e0000000-0000-0000-0000-000000000002","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from reports;
  assert n = 0, 'el moderador de Salta no ve reportes de Chubut';
end $$;
set local request.jwt.claims = '{"sub":"e0000000-0000-0000-0000-000000000001","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from reports;
  assert n = 1, 'el moderador de Chubut ve el reporte';
end $$;

-- ═══ 10 · El owner mantiene sus necesidades; el catálogo es público ══
set local request.jwt.claims = '{"sub":"d0000000-0000-0000-0000-000000000001","role":"authenticated"}';
insert into org_needs (org_id, kind, supply_id, urgency, quantity_note)
select 'c0000000-0000-0000-0000-000000000001', 'insumos', id, 'urgente', '2 en buen estado'
from supply_catalog where name = 'Motobombas';

update org_needs set urgency = 'cubierto'
 where org_id = 'c0000000-0000-0000-0000-000000000001';
do $$
declare c timestamptz;
begin
  select covered_at into c from org_needs
   where org_id = 'c0000000-0000-0000-0000-000000000001';
  assert c is not null, 'cubierto guarda cuándo, para el tachado de 72 hs';
end $$;
reset role;
reset request.jwt.claims;

select 'Todas las pruebas v2 pasaron' as resultado;

rollback;
