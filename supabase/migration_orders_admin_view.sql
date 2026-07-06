-- MELEK NAKIŞ — vista de administrador para revisar pedidos
-- Ejecutar en el SQL Editor de Supabase (una sola vez).

create or replace view orders_admin as
select
  o.id                as order_id,
  o.created_at,
  o.estado,
  o.nombre_contacto,
  o.telefono,
  o.ciudad,
  o.departamento,
  o.direccion,
  o.metodo_pago,
  o.total,
  o.costo_envio,
  o.notas,
  o.payment_reference,
  p.nombre            as cliente_nombre,
  oi.nombre_producto,
  oi.color,
  oi.talla,
  oi.cantidad,
  oi.precio_unitario,
  (oi.cantidad * oi.precio_unitario) as subtotal_item
from orders o
join order_items oi on oi.order_id = o.id
left join profiles p on p.id = o.user_id
order by o.created_at desc;

-- Supabase da acceso a las vistas nuevas a los roles anon/authenticated por defecto
-- (los mismos que usa la web pública). Se lo quitamos: esta vista es solo para
-- consultarla tú desde el SQL Editor / Table Editor con tu cuenta de Supabase,
-- nunca debe quedar expuesta a los clientes del sitio.
revoke all on orders_admin from anon, authenticated;
