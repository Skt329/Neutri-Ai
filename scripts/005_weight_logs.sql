-- NutriAI: weight history
-- Powers the weekly report card's "weight change" row and the log_weight tool.
-- Safe to re-run; uses IF NOT EXISTS everywhere.

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric not null check (weight_kg > 0 and weight_kg < 500),
  logged_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists weight_logs_user_time_idx
  on public.weight_logs(user_id, logged_at desc);

alter table public.weight_logs enable row level security;

drop policy if exists "weight_select_own" on public.weight_logs;
drop policy if exists "weight_insert_own" on public.weight_logs;
drop policy if exists "weight_update_own" on public.weight_logs;
drop policy if exists "weight_delete_own" on public.weight_logs;

create policy "weight_select_own" on public.weight_logs for select using (auth.uid() = user_id);
create policy "weight_insert_own" on public.weight_logs for insert with check (auth.uid() = user_id);
create policy "weight_update_own" on public.weight_logs for update using (auth.uid() = user_id);
create policy "weight_delete_own" on public.weight_logs for delete using (auth.uid() = user_id);

-- Keep profiles.weight_kg in sync with the latest logged weight (handy for BMR).
create or replace function public.sync_weight_to_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.profiles
     set weight_kg = new.weight_kg,
         updated_at = now()
   where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists on_weight_log_sync on public.weight_logs;
create trigger on_weight_log_sync
  after insert on public.weight_logs
  for each row execute function public.sync_weight_to_profile();
