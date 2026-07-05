-- MELEK NAKIŞ — seed inicial a partir de front/productos.json
-- Ejecutar después de schema.sql

with p as (
  insert into products (slug, categoria, nombre, precio, descripcion, fotos, activo) values
    ('top-001', 'tops', 'Top Brisa', 60000,
     'Top tejido a crochet en puntos cerrados, perfecto para la playa o una tarde de sol. Cada pieza es única, hecha a mano con hilos importados.',
     array['https://i.postimg.cc/K8CRC4t7/719612808-1516620286865288-3579648718645906182-n.jpg'], true),
    ('top-002', 'tops', 'Top Aura', 100000,
     'Top asimétrico con flecos en los bordes. Tejido en punto cerrado con hilo importado de alta calidad.',
     array['https://i.postimg.cc/PrZrHzCN/60D13E83-7F67-4B9B-BA75-7F7306700E33.jpg'], true),
    ('bikini-001', 'bikinis', 'Bikini Marea', 120000,
     'Conjunto de bikini tejido a crochet, top triángulo + panty brasilero. Hilo importado resistente al agua, piscina y al sol. Duradero y elegante.',
     array['https://i.postimg.cc/HxqzxpGZ/bikini.jpg'], true),
    ('bolso-001', 'bolsos', 'Bolso Boho', 60000,
     'Bolso tejido a crochet con asa corta. Mediano, ideal para la playa o el día a día. Broche interno.',
     array['https://i.postimg.cc/65kKXZ1j/721801001-1747141376276433-3745323484262872268-n.jpg'], true),
    ('acc-001', 'accesorios', 'Hat Summer', 45000,
     'Gorro tejido a crochet. Perfecta para complementar cualquier look.',
     array['https://i.postimg.cc/d0Xp2cPy/hay.jpg'], true)
  returning id, slug
)
insert into product_variants (product_id, color, talla, disponible, fotos)
select p.id, v.color, v.talla, v.disponible, v.fotos
from p
join (values
  -- top-001 (Top Brisa)
  ('top-001', 'Coco',  'XS', true,  array['https://i.postimg.cc/j5pc5sV3/coco-top.jpg']),
  ('top-001', 'Coco',  'S',  true,  array['https://i.postimg.cc/j5pc5sV3/coco-top.jpg']),
  ('top-001', 'Coco',  'M',  true,  array['https://i.postimg.cc/j5pc5sV3/coco-top.jpg']),
  ('top-001', 'Coco',  'L',  false, array['https://i.postimg.cc/j5pc5sV3/coco-top.jpg']),
  ('top-001', 'Sand',  'XS', true,  array['https://i.postimg.cc/Twz0wR8k/sand-top.jpg']),
  ('top-001', 'Sand',  'S',  true,  array['https://i.postimg.cc/Twz0wR8k/sand-top.jpg']),
  ('top-001', 'Sand',  'M',  true,  array['https://i.postimg.cc/Twz0wR8k/sand-top.jpg']),
  ('top-001', 'Sand',  'L',  true,  array['https://i.postimg.cc/Twz0wR8k/sand-top.jpg']),
  ('top-001', 'Green', 'XS', true,  array['https://i.postimg.cc/Vk2d25Xq/green.jpg']),
  ('top-001', 'Green', 'S',  true,  array['https://i.postimg.cc/Vk2d25Xq/green.jpg']),
  ('top-001', 'Green', 'M',  true,  array['https://i.postimg.cc/Vk2d25Xq/green.jpg']),
  ('top-001', 'Green', 'L',  true,  array['https://i.postimg.cc/Vk2d25Xq/green.jpg']),

  -- top-002 (Top Aura)
  ('top-002', 'Gold',  'XS', true,  array['https://i.postimg.cc/15MwGQKB/dorado.jpg']),
  ('top-002', 'Gold',  'S',  true,  array['https://i.postimg.cc/15MwGQKB/dorado.jpg']),
  ('top-002', 'Gold',  'M',  true,  array['https://i.postimg.cc/15MwGQKB/dorado.jpg']),
  ('top-002', 'Gold',  'L',  false, array['https://i.postimg.cc/15MwGQKB/dorado.jpg']),
  ('top-002', 'Black', 'XS', true,  array['https://i.postimg.cc/28ThQDx0/negro.jpg']),
  ('top-002', 'Black', 'S',  true,  array['https://i.postimg.cc/28ThQDx0/negro.jpg']),
  ('top-002', 'Black', 'M',  true,  array['https://i.postimg.cc/28ThQDx0/negro.jpg']),
  ('top-002', 'Black', 'L',  true,  array['https://i.postimg.cc/28ThQDx0/negro.jpg']),
  ('top-002', 'White', 'XS', true,  array['https://i.postimg.cc/qMQysTGj/blanco.jpg']),
  ('top-002', 'White', 'S',  true,  array['https://i.postimg.cc/qMQysTGj/blanco.jpg']),
  ('top-002', 'White', 'M',  true,  array['https://i.postimg.cc/qMQysTGj/blanco.jpg']),
  ('top-002', 'White', 'L',  true,  array['https://i.postimg.cc/qMQysTGj/blanco.jpg']),
  ('top-002', 'Green', 'XS', true,  array['https://i.postimg.cc/x1CHg4sH/verde.jpg']),
  ('top-002', 'Green', 'S',  true,  array['https://i.postimg.cc/x1CHg4sH/verde.jpg']),
  ('top-002', 'Green', 'M',  true,  array['https://i.postimg.cc/x1CHg4sH/verde.jpg']),
  ('top-002', 'Green', 'L',  false, array['https://i.postimg.cc/x1CHg4sH/verde.jpg']),

  -- bikini-001 (Bikini Marea)
  ('bikini-001', 'coco', 'XS', true, array['https://i.postimg.cc/HxqzxpGZ/bikini.jpg']),
  ('bikini-001', 'coco', 'S',  true, array['https://i.postimg.cc/HxqzxpGZ/bikini.jpg']),
  ('bikini-001', 'coco', 'M',  true, array['https://i.postimg.cc/HxqzxpGZ/bikini.jpg']),
  ('bikini-001', 'coco', 'L',  true, array['https://i.postimg.cc/HxqzxpGZ/bikini.jpg']),

  -- bolso-001 (Bolso Boho)
  ('bolso-001', 'Blue',  'Único', true, array['https://i.postimg.cc/B6rp6qWM/bolso.jpg']),
  ('bolso-001', 'Green', 'Único', true, array['https://i.postimg.cc/dtbFYCSW/723330728-976007725287864-7642049206456931610-n.jpg']),

  -- acc-001 (Hat Summer)
  ('acc-001', 'Sand',  'Único', true,  array['https://i.postimg.cc/SNhPmGfV/722993427-921463577621550-8049830527041629302-n.jpg']),
  ('acc-001', 'Green', 'Único', true,  array['https://i.postimg.cc/TPSFVvMb/723599269-1345778017651027-4909415122791203040-n.jpg']),
  ('acc-001', 'Gold',  'Único', false, array['https://i.postimg.cc/9Xp3kSGc/724458842-1494558278490848-7215065731571639641-n.jpg'])
) as v(slug, color, talla, disponible, fotos)
on v.slug = p.slug;
