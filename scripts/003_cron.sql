-- ============================================================
-- NeutriAI: pg_cron Setup (Production Only)
-- Schedule deferred memory extraction to run every 30 minutes.
-- Requires: pg_cron and pg_net extensions enabled in Supabase.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule: every 30 minutes, call the extraction endpoint.
-- Replace YOUR_APP_URL and YOUR_CRON_SECRET before running.

-- SELECT cron.schedule(
--   'extract-memories',
--   '*/30 * * * *',
--   $$
--     SELECT net.http_post(
--       'https://YOUR_APP_URL/api/cron/extract-memories',
--       '{}',
--       'application/json',
--       ARRAY[
--         net.http_header('Authorization', 'Bearer YOUR_CRON_SECRET')
--       ]
--     );
--   $$
-- );

-- To check scheduled jobs:
-- SELECT * FROM cron.job;

-- To remove the job:
-- SELECT cron.unschedule('extract-memories');
