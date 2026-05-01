-- ======================================
-- Shared chats — public read-only links
-- ======================================

create table if not exists public.shared_chats (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Index for fast token lookup
create index if not exists idx_shared_chats_token on public.shared_chats(token) where is_active = true;

-- RLS
alter table public.shared_chats enable row level security;

-- Owner can create, read, and revoke their own share links
create policy "Owner can manage shares"
  on public.shared_chats
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Anyone can read active share records (needed for the public route)
create policy "Public can read active shares"
  on public.shared_chats
  for select
  using (is_active = true);

-- Allow public read of conversations that have an active share link
create policy "Public can read shared conversations"
  on public.conversations
  for select
  using (
    exists (
      select 1 from public.shared_chats
      where shared_chats.conversation_id = conversations.id
        and shared_chats.is_active = true
    )
  );

-- Allow public read of messages in shared conversations
create policy "Public can read shared messages"
  on public.messages
  for select
  using (
    exists (
      select 1 from public.shared_chats
      where shared_chats.conversation_id = messages.conversation_id
        and shared_chats.is_active = true
    )
  );
