-- INE Price Tracker — Supabase schema
-- Run this in the Supabase SQL editor once, on a fresh project.

create extension if not exists "uuid-ossp";

-- One row per (product, option) the user has chosen to track.
create table if not exists tracked_products (
  id uuid primary key default uuid_generate_v4(),
  store_product_id text not null,        -- the ID as shown in the store's product page URL
  product_name text not null,
  option_label text not null,            -- e.g. "128GB / Black", "Pack of 3"
  product_url text not null,             -- full URL to the product page on the mock store
  option_selector_hint jsonb,            -- optional: how to pick this option in the DOM (see scraper/selectors.js)
  scrape_interval_minutes int not null default 120,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_product_id, option_label)
);

-- One row per scrape attempt, success or failure. This is the audit trail
-- the assignment explicitly asks to keep honest (failures included, not hidden).
create table if not exists scrape_log (
  id uuid primary key default uuid_generate_v4(),
  tracked_product_id uuid not null references tracked_products(id) on delete cascade,
  attempted_at timestamptz not null default now(),
  outcome text not null check (outcome in ('success', 'retried', 'failed')),
  attempt_number int not null default 1, -- 1 = first try, 2+ = retry within the same scrape run
  price numeric(12,2),                   -- null when outcome = 'failed'
  stock text,                            -- null when outcome = 'failed'; free text e.g. "In stock", "Out of stock", "12 left"
  http_status int,
  error_message text,
  duration_ms int
);

-- Convenience view: latest successful reading per tracked product, for the dashboard.
create or replace view latest_price as
select distinct on (tracked_product_id)
  tracked_product_id, attempted_at, price, stock
from scrape_log
where outcome = 'success'
order by tracked_product_id, attempted_at desc;

create index if not exists idx_scrape_log_product_time
  on scrape_log (tracked_product_id, attempted_at desc);

alter table tracked_products enable row level security;
alter table scrape_log enable row level security;

-- Single-user demo app: allow the service role (backend) full access.
-- The backend always talks to Supabase with the service_role key, never the anon key,
-- so no public policies are needed for this assignment's scope.
create policy "service role full access - tracked_products"
  on tracked_products for all using (true) with check (true);
create policy "service role full access - scrape_log"
  on scrape_log for all using (true) with check (true);
