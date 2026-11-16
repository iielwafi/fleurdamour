-- Fleur d'Amour: central catalogue, orders, sales and promotions.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  name text not null check (char_length(name) between 2 and 90),
  category text not null default 'autre',
  price numeric(10,2) check (price is null or price >= 0),
  stock integer not null default 0 check (stock >= 0),
  color text not null default '#ead2d0' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  description text not null default '',
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  phone text not null check (char_length(phone) between 6 and 30),
  city text not null check (char_length(city) between 2 and 100),
  requested_date date,
  notes text not null default '' check (char_length(notes) <= 1500),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 20),
  customisation jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','contacted','confirmed','preparing','shipped','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  product_id text references public.products(id) on delete set null,
  amount numeric(10,2) not null check (amount > 0),
  sold_on date not null default current_date,
  reference text not null default '' check (char_length(reference) <= 120),
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  discount integer not null check (discount between 1 and 90),
  product_id text references public.products(id) on delete set null,
  applies_to_all boolean not null default false,
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_store_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.sales enable row level security;
alter table public.offers enable row level security;

-- Visitors can only see published products and currently active promotions.
drop policy if exists "Public can read visible products" on public.products;
create policy "Public can read visible products" on public.products for select to anon, authenticated using (visible or public.is_store_admin());
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());

drop policy if exists "Visitors submit orders" on public.orders;
create policy "Visitors submit orders" on public.orders for insert to anon, authenticated with check (status = 'new');
drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders" on public.orders for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());

drop policy if exists "Admins manage sales" on public.sales;
create policy "Admins manage sales" on public.sales for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());

drop policy if exists "Public read active offers" on public.offers;
create policy "Public read active offers" on public.offers for select to anon, authenticated using (active and current_date between starts_on and ends_on or public.is_store_admin());
drop policy if exists "Admins manage offers" on public.offers;
create policy "Admins manage offers" on public.offers for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());

create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists sales_sold_on_idx on public.sales(sold_on desc);
create index if not exists offers_active_dates_idx on public.offers(active, starts_on, ends_on);

-- Seed only the three existing example bouquets; edit or remove them in Admin after setup.
insert into public.products (id,name,category,price,stock,color,description,visible) values
('rosee','Le bouquet Rosée','romantique',null,8,'#ead2d0','Douceur poudrée · Satin',true),
('eclat','Le bouquet Éclat','intemporel',null,6,'#e9e0d2','Écru & lumière · Satin',true),
('amethyste','Le bouquet Améthyste','delicat',null,5,'#ddd0d8','Nuances mauves · Satin',true)
on conflict (id) do nothing;
