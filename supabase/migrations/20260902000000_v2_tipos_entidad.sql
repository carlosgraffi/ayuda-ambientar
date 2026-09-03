-- ═══════════════════════════════════════════════════════════════════════
-- v2 · Tipos de entidad
--
-- El directorio deja de ser sólo de organizaciones cargadas por el admin:
-- se auto-registran brigadas, ONG, merenderos, municipios y redes
-- informales. Los valores nuevos van en una migración aparte porque
-- Postgres no permite USAR un valor agregado a un enum dentro de la misma
-- transacción que lo agrega.
-- ═══════════════════════════════════════════════════════════════════════
alter type org_type add value if not exists 'ong';
alter type org_type add value if not exists 'municipio';
alter type org_type add value if not exists 'red_informal';
alter type org_type add value if not exists 'otro';
