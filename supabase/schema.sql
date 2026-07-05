-- MELEK NAKIŞ — esquema mínimo Supabase (Fase 2)
-- Ejecutar completo en el SQL Editor de Supabase.

create extension if not exists "pgcrypto";

-- ══════════════════════════════
-- PRODUCTS
-- ══════════════════════════════
create table products (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,        -- ej: "top-001", conserva los ids de productos.json
  categoria   text not null,
  nombre      text not null,
  precio      integer not null check (precio >= 0),
  descripcion text,
  fotos       text[] not null default '{}',
  activo      boolean not null default true, -- producto visible/vendible en el catálogo
  created_at  timestamptz not null default now()
);

-- ══════════════════════════════
-- PRODUCT_VARIANTS (color × talla)
-- ══════════════════════════════
create table product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  color       text not null,
  talla       text not null,
  disponible  boolean not null default true,
  fotos       text[], -- null = usa products.fotos (fotosPorColor de productos.json)
  unique (product_id, color, talla)
);

-- ══════════════════════════════
-- PROFILES (extiende auth.users)
-- ══════════════════════════════
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  telefono   text,
  created_at timestamptz not null default now()
);

-- Crea el profile automáticamente al registrarse
create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, new.raw_user_meta_data->>'nombre');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ══════════════════════════════
-- CARTS / CART_ITEMS
-- Un carrito activo por usuario logueado (carrito de invitado vive en localStorage, Fase 4)
-- ══════════════════════════════
create table carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table cart_items (
  id         uuid primary key default gen_random_uuid(),
  cart_id    uuid not null references carts(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  cantidad   integer not null default 1 check (cantidad > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

-- ══════════════════════════════
-- ORDERS / ORDER_ITEMS
-- ══════════════════════════════
create table orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id),
  estado           text not null default 'pending' check (estado in ('pending','paid','failed','cancelled')),
  total            integer not null check (total >= 0), -- subtotal de productos + costo_envio
  costo_envio      integer not null default 0 check (costo_envio >= 0),
  nombre_contacto  text not null,
  telefono         text not null,
  ciudad           text not null,
  departamento     text not null,
  direccion        text not null,
  metodo_pago      text not null,
  notas            text,
  payment_reference text, -- id de la pasarela de pago, se llena en Fase 5
  created_at       timestamptz not null default now()
);

create table order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  variant_id       uuid not null references product_variants(id),
  nombre_producto  text not null, -- snapshot, no depende de que el producto siga igual
  color            text not null,
  talla            text not null,
  precio_unitario  integer not null check (precio_unitario >= 0),
  cantidad         integer not null check (cantidad > 0)
);

-- ══════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════
alter table products         enable row level security;
alter table product_variants enable row level security;
alter table profiles         enable row level security;
alter table carts            enable row level security;
alter table cart_items       enable row level security;
alter table orders           enable row level security;
alter table order_items      enable row level security;

-- Catálogo: lectura pública, escritura solo desde el panel de Supabase (service_role)
create policy "products_select_public" on products
  for select using (true);
create policy "product_variants_select_public" on product_variants
  for select using (true);

-- Profiles: cada usuario ve/edita solo el suyo
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- Carts: solo el dueño
create policy "carts_all_own" on carts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cart items: solo si el carrito es del usuario
create policy "cart_items_all_own" on cart_items
  for all using (
    exists (select 1 from carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid())
  ) with check (
    exists (select 1 from carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid())
  );

-- Orders: el usuario crea y ve las suyas, no las puede editar ni borrar (eso lo hace el backend/webhook)
create policy "orders_select_own" on orders
  for select using (auth.uid() = user_id);
create policy "orders_insert_own" on orders
  for insert with check (auth.uid() = user_id);

-- Order items: visibles solo si la orden es del usuario; se insertan junto con la orden
create policy "order_items_select_own" on order_items
  for select using (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );
create policy "order_items_insert_own" on order_items
  for insert with check (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );
