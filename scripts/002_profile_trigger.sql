-- Auto-create a profile row for every new auth user.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Keep updated_at fresh on profile edits.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated on public.profiles;
create trigger profiles_touch_updated
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists pantry_touch_updated on public.pantry_items;
create trigger pantry_touch_updated
  before update on public.pantry_items
  for each row execute function public.touch_updated_at();

drop trigger if exists conv_touch_updated on public.conversations;
create trigger conv_touch_updated
  before update on public.conversations
  for each row execute function public.touch_updated_at();
