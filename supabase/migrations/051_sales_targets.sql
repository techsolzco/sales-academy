-- Sales targets (audit §3 #13, MEDIUM).
-- One monthly sales target (PKR) per intern, set by an admin. Progress is
-- computed in code from sales_records via fetchMySales() — no amount is
-- stored here beyond the target itself.
create table if not exists public.sales_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  target_amount integer not null check (target_amount > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table public.sales_targets enable row level security;

create policy "Users SELECT own sales_targets"
  on public.sales_targets for select to authenticated
  using (user_id = auth.uid() or current_user_role() = 'admin');

create policy "Admins INSERT sales_targets"
  on public.sales_targets for insert to authenticated
  with check (current_user_role() = 'admin');

create policy "Admins UPDATE sales_targets"
  on public.sales_targets for update to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy "Admins DELETE sales_targets"
  on public.sales_targets for delete to authenticated
  using (current_user_role() = 'admin');

create index if not exists sales_targets_month_idx
  on public.sales_targets (month);
