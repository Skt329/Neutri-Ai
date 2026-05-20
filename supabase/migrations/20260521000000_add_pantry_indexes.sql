-- Add composite indexes on pantry_items for common query patterns
-- These prevent full table scans when filtering by user + name/category/expiry

CREATE INDEX IF NOT EXISTS idx_pantry_items_user_name
  ON public.pantry_items (user_id, name);

CREATE INDEX IF NOT EXISTS idx_pantry_items_user_category
  ON public.pantry_items (user_id, category);

CREATE INDEX IF NOT EXISTS idx_pantry_items_user_expiry
  ON public.pantry_items (user_id, expires_on);

-- Add CHECK constraint on meal_logs to ensure calories >= 0
ALTER TABLE public.meal_logs
  ADD CONSTRAINT chk_meal_logs_calories_positive CHECK (calories >= 0);

-- Add CHECK constraint on nutrition_targets
ALTER TABLE public.nutrition_targets
  ADD CONSTRAINT chk_nutrition_targets_calories_range CHECK (calories >= 800 AND calories <= 6000);
