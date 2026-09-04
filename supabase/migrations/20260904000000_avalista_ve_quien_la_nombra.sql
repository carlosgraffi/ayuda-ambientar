-- La avalista ve a quién está avalando.
--
-- Una entidad en nivel 0 no es pública, y eso sigue firme. Pero cuando
-- registra que la organización X la conoce, X recibe el pedido en su
-- panel — y la bandeja mostraba "pidió tu aval hace 1 día" sin nombre,
-- porque la política le escondía la fila. Nadie puede avalar (ni negarse
-- con fundamento) a alguien que no puede ver.
--
-- Nombrar a una organización como referencia es, de este lado, consentir
-- que ESA organización te vea. Sólo la ficha (nombre, descripción,
-- ubicación): los canales y necesidades siguen bajo la regla general.

drop policy orgs_lectura on organizations;
create policy orgs_lectura on organizations for select
  using (
    (status in ('verificada', 'pausada') and verification_level >= 1)
    or owner_user_id = auth.uid()
    or (tenant_id is not null and es_miembro(tenant_id))
    or es_moderador_de_org(id)
    -- es_owner_de es security definer: sin él, esta subconsulta sobre la
    -- propia tabla dispararía la recursión infinita de políticas.
    or exists (
      select 1 from endorsements e
      where e.endorsed_org_id = organizations.id
        and es_owner_de(e.endorser_org_id)
    )
  );
