-- Persistent cache for YouTube video transcripts
-- Shared across all users (transcripts are public YouTube data)
CREATE TABLE IF NOT EXISTS youtube_transcripts (
  video_id   TEXT PRIMARY KEY,              -- YouTube video ID (11 chars)
  transcript TEXT NOT NULL,                  -- Joined transcript text (truncated to ~6k words)
  word_count INTEGER NOT NULL DEFAULT 0,     -- Word count for context budget tracking
  language   TEXT,                            -- Language code of the fetched transcript
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cleanup queries (e.g., purge transcripts older than 90 days)
CREATE INDEX idx_youtube_transcripts_fetched_at ON youtube_transcripts (fetched_at);

-- RLS: transcripts are shared/public cache (no user-specific access needed)
-- Any authenticated user can read/write since transcripts are public YouTube data
ALTER TABLE youtube_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read transcripts"
  ON youtube_transcripts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert transcripts"
  ON youtube_transcripts FOR INSERT
  TO authenticated
  WITH CHECK (true);
