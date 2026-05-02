-- ============================================================
-- 004: Swiggy OAuth token storage
-- Stores encrypted access tokens per user for Swiggy MCP auth.
-- Tokens are AES-256-GCM encrypted at the application layer.
-- ============================================================

CREATE TABLE IF NOT EXISTS swiggy_tokens (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  -- AES-256-GCM encrypted access token (base64 encoded: iv + ciphertext + tag)
  access_token_enc TEXT NOT NULL,
  token_type  TEXT NOT NULL DEFAULT 'Bearer',
  expires_at  TIMESTAMPTZ NOT NULL,
  scopes      TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: users can only access their own tokens
ALTER TABLE swiggy_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_swiggy_tokens"
  ON swiggy_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_swiggy_tokens_user_id ON swiggy_tokens(user_id);

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_swiggy_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_swiggy_tokens_updated_at
  BEFORE UPDATE ON swiggy_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_swiggy_tokens_updated_at();
