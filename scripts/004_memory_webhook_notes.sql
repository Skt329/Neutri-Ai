-- Memory extraction webhook — create this in the Supabase dashboard (Database → Webhooks).
--
-- Why the dashboard: Supabase Database Webhooks are managed by the Supabase
-- platform (they are not plain Postgres triggers), and are most reliably
-- created via the dashboard UI or the Management API. The SQL below documents
-- the intended configuration.
--
-- Trigger target: public.messages (INSERT)
-- HTTP method:    POST
-- URL:            https://<PROJECT_REF>.functions.supabase.co/extract-memories
-- Headers:        Authorization: Bearer <SERVICE_ROLE_KEY_OR_FN_SECRET>
--
-- The Edge Function source is at supabase/functions/extract-memories/index.ts.
-- Deploy it with:
--   supabase functions deploy extract-memories
--   supabase secrets set AI_GATEWAY_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
--
-- If you prefer to use a plain pg_net trigger, you can use the function below.
-- It requires the `pg_net` extension and a Supabase-provided settings entry.

create extension if not exists pg_net;

create or replace function public.call_extract_memories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text := current_setting('app.extract_memories_url', true);
  fn_token text := current_setting('app.extract_memories_token', true);
begin
  if fn_url is null or fn_url = '' then
    return new;
  end if;

  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', coalesce('Bearer ' || fn_token, '')
    ),
    body := jsonb_build_object(
      'type', tg_op,
      'schema', tg_table_schema,
      'table', tg_table_name,
      'record', to_jsonb(new),
      'old_record', null
    )
  );
  return new;
end;
$$;

-- Once you set the GUCs:
--   alter database postgres set app.extract_memories_url = 'https://<PROJECT_REF>.functions.supabase.co/extract-memories';
--   alter database postgres set app.extract_memories_token = '<FUNCTION_SECRET>';
--
-- You can attach the trigger with:
--   drop trigger if exists messages_extract_memories on public.messages;
--   create trigger messages_extract_memories
--     after insert on public.messages
--     for each row execute function public.call_extract_memories();
