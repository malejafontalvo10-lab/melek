-- MELEK NAKIŞ — panel admin (marcar pedidos como pagados/enviados desde el sitio)
-- Ejecutar en el SQL Editor de Supabase (una sola vez).

-- ══════════════════════════════
-- 1. Datos de envío en orders
-- ══════════════════════════════
alter table orders add column if not exists transportadora text;
alter table orders add column if not exists guia_envio      text;
alter table orders add column if not exists enviado_at      timestamptz;

-- Se agrega 'shipped' a los estados posibles
alter table orders drop constraint if exists orders_estado_check;
alter table orders add constraint orders_estado_check
  check (estado in ('pending','paid','shipped','failed','cancelled'));

-- ══════════════════════════════
-- 2. Marca de administrador en profiles
-- ══════════════════════════════
alter table profiles add column if not exists is_admin boolean not null default false;

-- Después de correr esta migración, marca tu propio usuario como admin
-- (solo tú, una vez) desde el SQL Editor:
--   update profiles set is_admin = true where id = 'TU-USER-ID-AQUI';
-- Tu user id lo ves en Authentication → Users dentro de Supabase.

-- ══════════════════════════════
-- 3. RLS: el admin ve y actualiza TODOS los pedidos
-- (se suma a las políticas existentes que solo dejaban ver los propios)
-- ══════════════════════════════
create policy "orders_admin_select_all" on orders
  for select using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin)
  );

create policy "orders_admin_update" on orders
  for update using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin)
  ) with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin)
  );

create policy "order_items_admin_select_all" on order_items
  for select using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin)
  );

-- ══════════════════════════════
-- 4. Realtime: el panel admin se actualiza solo cuando entra un pedido nuevo
-- ══════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
end $$;
