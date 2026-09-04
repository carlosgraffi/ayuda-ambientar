-- Cancelar un pedido de aval hecho por error.
--
-- Sólo mientras esté en 'solicitado': un pedido sin responder es tuyo y
-- podés retirarlo (además libera cupo, que es de 3). Un aval ya dado es
-- una declaración de la otra organización — no se borra desde afuera; si
-- hay que bajarlo, eso es una revocación y la hace quien lo dio o la
-- moderación.

create policy avales_cancelacion on endorsements for delete
  using (status = 'solicitado' and es_owner_de(endorsed_org_id));
