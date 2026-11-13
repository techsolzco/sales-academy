-- Sales performance log (audit §3 #2, HIGH).
-- Interns log each sale (product/bundle, amount, customer ref, date);
-- admin sees per-intern totals and a sales leaderboard. No sales data
-- existed anywhere in the code before this table.
create table if not exists public.sales_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_name text not null,
  bundle_name text,
  amount_pkr integer not null check (amount_pkr > 0),
  customer_ref text,
  sale_date date not null default CURRENT_DATE,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.sales_records enable row level security;

create policy "Users SELECT own sales_records"
  on public.sales_records for select to authenticated
  using (user_id = auth.uid() or current_user_role() = 'admin');

create policy "Users INSERT own sales_records"
  on public.sales_records for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users UPDATE own sales_records"
  on public.sales_records for update to authenticated
  using (user_id = auth.uid() or current_user_role() = 'admin')
  with check (user_id = auth.uid() or current_user_role() = 'admin');

create policy "Users DELETE own sales_records"
  on public.sales_records for delete to authenticated
  using (user_id = auth.uid() or current_user_role() = 'admin');

create index if not exists sales_records_user_sale_date_idx
  on public.sales_records (user_id, sale_date desc);

create index if not exists sales_records_sale_date_idx
  on public.sales_records (sale_date desc);
