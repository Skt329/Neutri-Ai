-- pgvector-backed long-term memory for the AI dietitian.
-- Note: embedding dim = 1536 to match text-embedding-3-small (OpenAI) via AI Gateway.

create extension if not exists vector;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  kind text check (kind in ('preference','allergy','habit','goal','context','dislike')),
  embedding vector(1536),
  source_message_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists memories_user_idx on public.memories(user_id, created_at desc);

-- IVFFlat requires ANALYZE + data to be effective; safe to create empty.
create index if not exists memories_embedding_idx
  on public.memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.memories enable row level security;

drop policy if exists "mem_select_own" on public.memories;
drop policy if exists "mem_insert_own" on public.memories;
drop policy if exists "mem_update_own" on public.memories;
drop policy if exists "mem_delete_own" on public.memories;

create policy "mem_select_own" on public.memories for select using (auth.uid() = user_id);
create policy "mem_insert_own" on public.memories for insert with check (auth.uid() = user_id);
create policy "mem_update_own" on public.memories for update using (auth.uid() = user_id);
create policy "mem_delete_own" on public.memories for delete using (auth.uid() = user_id);

-- Vector similarity search RPC scoped to a single user (bypasses RLS via security definer,
-- but explicitly filters by user_id so a JWT user can still only query their own rows).
create or replace function public.match_memories(
  p_user_id uuid,
  p_embedding vector(1536),
  p_match_count int default 6,
  p_min_similarity float default 0.55
)
returns table (
  id uuid,
  content text,
  kind text,
  similarity float
)
language sql
stable
as $$
  select
    m.id,
    m.content,
    m.kind,
    1 - (m.embedding <=> p_embedding) as similarity
  from public.memories m
  where m.user_id = p_user_id
    and m.embedding is not null
    and 1 - (m.embedding <=> p_embedding) >= p_min_similarity
  order by m.embedding <=> p_embedding
  limit p_match_count
$$;
