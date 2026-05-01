-- ============================================================
-- NeutriAI: Core Schema
-- Creates all tables, indexes, RLS policies, and triggers.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

---------------------------------------------------------------------
-- profiles
---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  age INT CHECK (age IS NULL OR (age > 0 AND age < 130)),
  sex TEXT CHECK (sex IN ('male','female','other','prefer_not_say')),
  height_cm NUMERIC CHECK (height_cm IS NULL OR height_cm > 0),
  weight_kg NUMERIC CHECK (weight_kg IS NULL OR weight_kg > 0),
  activity_level TEXT CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  goal TEXT CHECK (goal IN ('lose','maintain','gain','recomp')),
  dietary_preferences TEXT[] NOT NULL DEFAULT '{}',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  health_conditions TEXT[] NOT NULL DEFAULT '{}',
  cuisines TEXT[] NOT NULL DEFAULT '{}',
  kitchen_appliances TEXT[] NOT NULL DEFAULT '{}',
  favorite_ingredients TEXT[] NOT NULL DEFAULT '{}',
  disliked_ingredients TEXT[] NOT NULL DEFAULT '{}',
  cooking_skill TEXT CHECK (cooking_skill IN ('beginner','intermediate','advanced')),
  household_size INT CHECK (household_size IS NULL OR (household_size > 0 AND household_size <= 20)),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

---------------------------------------------------------------------
-- nutrition_targets
---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nutrition_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calories INT NOT NULL CHECK (calories > 0),
  protein_g NUMERIC NOT NULL CHECK (protein_g >= 0),
  carbs_g NUMERIC NOT NULL CHECK (carbs_g >= 0),
  fat_g NUMERIC NOT NULL CHECK (fat_g >= 0),
  fiber_g NUMERIC CHECK (fiber_g IS NULL OR fiber_g >= 0),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nutrition_targets_user_idx
  ON public.nutrition_targets(user_id, effective_from DESC);

ALTER TABLE public.nutrition_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "targets_select_own" ON public.nutrition_targets;
DROP POLICY IF EXISTS "targets_insert_own" ON public.nutrition_targets;
DROP POLICY IF EXISTS "targets_update_own" ON public.nutrition_targets;
DROP POLICY IF EXISTS "targets_delete_own" ON public.nutrition_targets;

CREATE POLICY "targets_select_own" ON public.nutrition_targets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "targets_insert_own" ON public.nutrition_targets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "targets_update_own" ON public.nutrition_targets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "targets_delete_own" ON public.nutrition_targets FOR DELETE USING (auth.uid() = user_id);

---------------------------------------------------------------------
-- meal_logs
---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_type TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  description TEXT NOT NULL,
  calories NUMERIC CHECK (calories IS NULL OR calories >= 0),
  protein_g NUMERIC CHECK (protein_g IS NULL OR protein_g >= 0),
  carbs_g NUMERIC CHECK (carbs_g IS NULL OR carbs_g >= 0),
  fat_g NUMERIC CHECK (fat_g IS NULL OR fat_g >= 0),
  fiber_g NUMERIC CHECK (fiber_g IS NULL OR fiber_g >= 0),
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','chat','swiggy')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meal_logs_user_time_idx
  ON public.meal_logs(user_id, logged_at DESC);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meals_select_own" ON public.meal_logs;
DROP POLICY IF EXISTS "meals_insert_own" ON public.meal_logs;
DROP POLICY IF EXISTS "meals_update_own" ON public.meal_logs;
DROP POLICY IF EXISTS "meals_delete_own" ON public.meal_logs;

CREATE POLICY "meals_select_own" ON public.meal_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meals_insert_own" ON public.meal_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meals_update_own" ON public.meal_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meals_delete_own" ON public.meal_logs FOR DELETE USING (auth.uid() = user_id);

---------------------------------------------------------------------
-- pantry_items
---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC CHECK (quantity IS NULL OR quantity >= 0),
  unit TEXT,
  category TEXT,
  expires_on DATE,
  calories_kcal NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  fiber_g NUMERIC,
  nutrition_basis TEXT CHECK (nutrition_basis IN ('per_100g','per_100ml','per_piece','per_serving')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pantry_user_name_idx ON public.pantry_items(user_id, lower(name));

ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pantry_select_own" ON public.pantry_items;
DROP POLICY IF EXISTS "pantry_insert_own" ON public.pantry_items;
DROP POLICY IF EXISTS "pantry_update_own" ON public.pantry_items;
DROP POLICY IF EXISTS "pantry_delete_own" ON public.pantry_items;

CREATE POLICY "pantry_select_own" ON public.pantry_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pantry_insert_own" ON public.pantry_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pantry_update_own" ON public.pantry_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pantry_delete_own" ON public.pantry_items FOR DELETE USING (auth.uid() = user_id);

---------------------------------------------------------------------
-- conversations
---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  memory_extracted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_user_idx
  ON public.conversations(user_id, updated_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conv_select_own" ON public.conversations;
DROP POLICY IF EXISTS "conv_insert_own" ON public.conversations;
DROP POLICY IF EXISTS "conv_update_own" ON public.conversations;
DROP POLICY IF EXISTS "conv_delete_own" ON public.conversations;

CREATE POLICY "conv_select_own" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conv_insert_own" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conv_update_own" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "conv_delete_own" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

---------------------------------------------------------------------
-- messages (stores AI SDK UIMessage parts as JSONB)
---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  parts JSONB NOT NULL,
  ordinal INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_conv_idx
  ON public.messages(conversation_id, ordinal ASC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_select_own" ON public.messages;
DROP POLICY IF EXISTS "msg_insert_own" ON public.messages;
DROP POLICY IF EXISTS "msg_update_own" ON public.messages;
DROP POLICY IF EXISTS "msg_delete_own" ON public.messages;

CREATE POLICY "msg_select_own" ON public.messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "msg_insert_own" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "msg_update_own" ON public.messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "msg_delete_own" ON public.messages FOR DELETE USING (auth.uid() = user_id);

---------------------------------------------------------------------
-- memories (pgvector-backed long-term AI memory, 1024-dim for NeMo Retriever)
---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'chat',
  embedding vector(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS memories_user_idx ON public.memories(user_id, created_at DESC);

-- HNSW index works well at any data size (unlike ivfflat which needs 10K+ rows)
CREATE INDEX IF NOT EXISTS memories_embedding_idx
  ON public.memories USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mem_select_own" ON public.memories;
DROP POLICY IF EXISTS "mem_insert_own" ON public.memories;
DROP POLICY IF EXISTS "mem_update_own" ON public.memories;
DROP POLICY IF EXISTS "mem_delete_own" ON public.memories;

CREATE POLICY "mem_select_own" ON public.memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mem_insert_own" ON public.memories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mem_update_own" ON public.memories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "mem_delete_own" ON public.memories FOR DELETE USING (auth.uid() = user_id);

---------------------------------------------------------------------
-- weight_logs
---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weight_logs_user_time_idx
  ON public.weight_logs(user_id, logged_at DESC);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weight_select_own" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_insert_own" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_update_own" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_delete_own" ON public.weight_logs;

CREATE POLICY "weight_select_own" ON public.weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weight_insert_own" ON public.weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weight_update_own" ON public.weight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "weight_delete_own" ON public.weight_logs FOR DELETE USING (auth.uid() = user_id);
