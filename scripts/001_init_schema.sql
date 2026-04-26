-- NutriAI core schema
-- Safe to run multiple times (idempotent)

create extension if not exists "pgcrypto";

---------------------------------------------------------------------
-- profiles
---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  age int check (age is null or (age > 0 and age < 130)),
  sex text check (sex in ('male','female','other','prefer_not_say')),
  height_cm numeric check (height_cm is null or height_cm > 0),
  weight_kg numeric check (weight_kg is null or weight_kg > 0),
  activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active')),
  goal text check (goal in ('lose','maintain','gain','recomp')),
  dietary_preferences text[] not null default '{}',
  allergies text[] not null default '{}',
  health_conditions text[] not null default '{}',
  timezone text not null default 'UTC',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

---------------------------------------------------------------------
-- nutrition_targets (daily target macros; latest row by effective_from wins)
---------------------------------------------------------------------
create table if not exists public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calories int not null check (calories > 0),
  protein_g numeric not null check (protein_g >= 0),
  carbs_g numeric not null check (carbs_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  fiber_g numeric check (fiber_g is null or fiber_g >= 0),
  effective_from date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists nutrition_targets_user_idx
  on public.nutrition_targets(user_id, effective_from desc);

alter table public.nutrition_targets enable row level security;

drop policy if exists "targets_select_own" on public.nutrition_targets;
drop policy if exists "targets_insert_own" on public.nutrition_targets;
drop policy if exists "targets_update_own" on public.nutrition_targets;
drop policy if exists "targets_delete_own" on public.nutrition_targets;

create policy "targets_select_own" on public.nutrition_targets for select using (auth.uid() = user_id);
create policy "targets_insert_own" on public.nutrition_targets for insert with check (auth.uid() = user_id);
create policy "targets_update_own" on public.nutrition_targets for update using (auth.uid() = user_id);
create policy "targets_delete_own" on public.nutrition_targets for delete using (auth.uid() = user_id);

---------------------------------------------------------------------
-- meal_logs
---------------------------------------------------------------------
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack')),
  description text not null,
  calories numeric check (calories is null or calories >= 0),
  protein_g numeric check (protein_g is null or protein_g >= 0),
  carbs_g numeric check (carbs_g is null or carbs_g >= 0),
  fat_g numeric check (fat_g is null or fat_g >= 0),
  fiber_g numeric check (fiber_g is null or fiber_g >= 0),
  items jsonb not null default '[]'::jsonb,
  source text not null default 'manual' check (source in ('manual','chat','swiggy')),
  created_at timestamptz not null default now()
);

create index if not exists meal_logs_user_time_idx
  on public.meal_logs(user_id, logged_at desc);

alter table public.meal_logs enable row level security;

drop policy if exists "meals_select_own" on public.meal_logs;
drop policy if exists "meals_insert_own" on public.meal_logs;
drop policy if exists "meals_update_own" on public.meal_logs;
drop policy if exists "meals_delete_own" on public.meal_logs;

create policy "meals_select_own" on public.meal_logs for select using (auth.uid() = user_id);
create policy "meals_insert_own" on public.meal_logs for insert with check (auth.uid() = user_id);
create policy "meals_update_own" on public.meal_logs for update using (auth.uid() = user_id);
create policy "meals_delete_own" on public.meal_logs for delete using (auth.uid() = user_id);

---------------------------------------------------------------------
-- pantry_items
---------------------------------------------------------------------
create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity numeric check (quantity is null or quantity >= 0),
  unit text,
  category text,
  expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pantry_user_name_idx on public.pantry_items(user_id, lower(name));

alter table public.pantry_items enable row level security;

drop policy if exists "pantry_select_own" on public.pantry_items;
drop policy if exists "pantry_insert_own" on public.pantry_items;
drop policy if exists "pantry_update_own" on public.pantry_items;
drop policy if exists "pantry_delete_own" on public.pantry_items;

create policy "pantry_select_own" on public.pantry_items for select using (auth.uid() = user_id);
create policy "pantry_insert_own" on public.pantry_items for insert with check (auth.uid() = user_id);
create policy "pantry_update_own" on public.pantry_items for update using (auth.uid() = user_id);
create policy "pantry_delete_own" on public.pantry_items for delete using (auth.uid() = user_id);

---------------------------------------------------------------------
-- conversations
---------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_idx
  on public.conversations(user_id, updated_at desc);

alter table public.conversations enable row level security;

drop policy if exists "conv_select_own" on public.conversations;
drop policy if exists "conv_insert_own" on public.conversations;
drop policy if exists "conv_update_own" on public.conversations;
drop policy if exists "conv_delete_own" on public.conversations;

create policy "conv_select_own" on public.conversations for select using (auth.uid() = user_id);
create policy "conv_insert_own" on public.conversations for insert with check (auth.uid() = user_id);
create policy "conv_update_own" on public.conversations for update using (auth.uid() = user_id);
create policy "conv_delete_own" on public.conversations for delete using (auth.uid() = user_id);

---------------------------------------------------------------------
-- messages (stores AI SDK UIMessage parts as jsonb)
---------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  parts jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conv_idx
  on public.messages(conversation_id, created_at asc);

alter table public.messages enable row level security;

drop policy if exists "msg_select_own" on public.messages;
drop policy if exists "msg_insert_own" on public.messages;
drop policy if exists "msg_delete_own" on public.messages;

create policy "msg_select_own" on public.messages for select using (auth.uid() = user_id);
create policy "msg_insert_own" on public.messages for insert with check (auth.uid() = user_id);
create policy "msg_delete_own" on public.messages for delete using (auth.uid() = user_id);
