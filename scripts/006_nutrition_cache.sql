-- ============================================================
-- NeutriAI: Nutrition Cache Table
-- Shared cache for USDA / Open Food Facts lookups.
-- 30-day TTL, not user-scoped (nutrition data is public).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nutrition_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  query TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('usda', 'openfoodfacts')),
  results JSONB NOT NULL DEFAULT '[]'::JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nutrition_cache_key_idx
  ON public.nutrition_cache(cache_key);

CREATE INDEX IF NOT EXISTS nutrition_cache_expires_idx
  ON public.nutrition_cache(expires_at);

-- Public read, service-role write (no user-scoping needed)
ALTER TABLE public.nutrition_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nutrition_cache_read_all" ON public.nutrition_cache;
DROP POLICY IF EXISTS "nutrition_cache_service_write" ON public.nutrition_cache;
DROP POLICY IF EXISTS "nutrition_cache_service_update" ON public.nutrition_cache;
DROP POLICY IF EXISTS "nutrition_cache_service_delete" ON public.nutrition_cache;

CREATE POLICY "nutrition_cache_read_all"     ON public.nutrition_cache FOR SELECT USING (true);
CREATE POLICY "nutrition_cache_service_write" ON public.nutrition_cache FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "nutrition_cache_service_update" ON public.nutrition_cache FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "nutrition_cache_service_delete" ON public.nutrition_cache FOR DELETE USING (auth.role() = 'service_role');
