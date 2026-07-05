-- MELEK NAKIŞ — migración: costo de envío en orders
-- Ejecutar solo si ya corriste schema.sql antes de esta fase.

alter table orders add column if not exists costo_envio integer not null default 0 check (costo_envio >= 0);
