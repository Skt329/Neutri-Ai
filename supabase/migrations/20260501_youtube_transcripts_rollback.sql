-- Rollback: remove youtube_transcripts table and all associated objects
DROP POLICY IF EXISTS "Authenticated users can insert transcripts" ON youtube_transcripts;
DROP POLICY IF EXISTS "Authenticated users can read transcripts" ON youtube_transcripts;
DROP INDEX IF EXISTS idx_youtube_transcripts_fetched_at;
DROP TABLE IF EXISTS youtube_transcripts;
