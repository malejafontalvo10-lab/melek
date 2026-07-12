-- MELEK NAKIŞ — migración: geolocalización y teléfono internacional en checkout
-- Ejecutar solo si ya corriste schema.sql y migration_shipping.sql antes de esta fase.

alter table orders add column if not exists pais text;
alter table orders add column if not exists pais_iso2 text;
alter table orders add column if not exists codigo_postal text;
alter table orders add column if not exists phone_dial_code text;
alter table orders add column if not exists phone_country_iso2 text;

alter table profiles add column if not exists pais text;
alter table profiles add column if not exists pais_iso2 text;
alter table profiles add column if not exists departamento text;
alter table profiles add column if not exists ciudad text;
alter table profiles add column if not exists direccion text;
alter table profiles add column if not exists codigo_postal text;
alter table profiles add column if not exists phone_dial_code text;
alter table profiles add column if not exists phone_country_iso2 text;
