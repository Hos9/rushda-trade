-- Run this whole file once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- It creates every table this app needs, locks each one down with Row Level
-- Security so users can only ever see their own rows, and wires up a
-- "profiles" table that's automatically populated when someone signs up.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles: one row per auth user, holds display info
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  company_name text default '',
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id);

create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- customers / suppliers
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text default '',
  email text default '',
  address text default '',
  opening_balance numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text default '',
  email text default '',
  address text default '',
  opening_balance numeric not null default 0,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- items (used on both sales and purchase lines)
-- ---------------------------------------------------------------------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unit text default 'pcs',
  purchase_price numeric not null default 0,
  sale_price numeric not null default 0,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- sales / purchases (item lines stored as jsonb, same shape the UI uses)
-- ---------------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  date date not null default current_date,
  invoice_no text default '',
  items jsonb not null default '[]',
  total_amount numeric not null default 0,
  note text default '',
  created_at timestamptz default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  date date not null default current_date,
  invoice_no text default '',
  items jsonb not null default '[]',
  total_amount numeric not null default 0,
  note text default '',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- receipts (received from customers) / payments (paid to suppliers)
-- ---------------------------------------------------------------------
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  date date not null default current_date,
  amount numeric not null,
  mode text default 'cash',
  note text default '',
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  date date not null default current_date,
  amount numeric not null,
  mode text default 'cash',
  note text default '',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security: every table below is scoped to user_id = auth.uid()
-- ---------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.items enable row level security;
alter table public.sales enable row level security;
alter table public.purchases enable row level security;
alter table public.receipts enable row level security;
alter table public.payments enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['customers','suppliers','items','sales','purchases','receipts','payments']
  loop
    execute format('create policy "select own %I" on public.%I for select using (auth.uid() = user_id);', t, t);
    execute format('create policy "insert own %I" on public.%I for insert with check (auth.uid() = user_id);', t, t);
    execute format('create policy "update own %I" on public.%I for update using (auth.uid() = user_id);', t, t);
    execute format('create policy "delete own %I" on public.%I for delete using (auth.uid() = user_id);', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Helpful indexes
-- ---------------------------------------------------------------------
create index if not exists idx_customers_user on public.customers(user_id);
create index if not exists idx_suppliers_user on public.suppliers(user_id);
create index if not exists idx_items_user on public.items(user_id);
create index if not exists idx_sales_user on public.sales(user_id);
create index if not exists idx_sales_customer on public.sales(customer_id);
create index if not exists idx_purchases_user on public.purchases(user_id);
create index if not exists idx_purchases_supplier on public.purchases(supplier_id);
create index if not exists idx_receipts_user on public.receipts(user_id);
create index if not exists idx_receipts_customer on public.receipts(customer_id);
create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_supplier on public.payments(supplier_id);
