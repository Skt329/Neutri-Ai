-- ============================================================
-- NeutriAI: Triggers & Functions
-- Auto-profile creation, updated_at triggers, weight sync,
-- memory search, and deferred memory extraction helpers.
-- Safe to re-run (uses OR REPLACE / IF NOT EXISTS).
-- ============================================================

---------------------------------------------------------------------
-- Auto-create a profile row for every new auth user
---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

---------------------------------------------------------------------
-- Generic updated_at touch trigger
---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_touch_updated ON public.profiles;
CREATE TRIGGER profiles_touch_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS pantry_touch_updated ON public.pantry_items;
CREATE TRIGGER pantry_touch_updated
  BEFORE UPDATE ON public.pantry_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS conv_touch_updated ON public.conversations;
CREATE TRIGGER conv_touch_updated
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

---------------------------------------------------------------------
-- Sync latest weight log → profiles.weight_kg
---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_weight_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
     SET weight_kg = NEW.weight_kg,
         updated_at = NOW()
   WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_weight_log_sync ON public.weight_logs;
CREATE TRIGGER on_weight_log_sync
  AFTER INSERT ON public.weight_logs
  FOR EACH ROW EXECUTE FUNCTION public.sync_weight_to_profile();

---------------------------------------------------------------------
-- Vector similarity search for memories (1024-dim, NeMo Retriever)
---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_memories_for_user(
  p_user_id UUID,
  query_embedding vector(1024),
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE(id UUID, content TEXT, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.content,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE m.user_id = p_user_id
    AND 1 - (m.embedding <=> query_embedding) > similarity_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

---------------------------------------------------------------------
-- Deferred memory extraction helpers (used by /api/cron/extract-memories)
---------------------------------------------------------------------

-- Find conversations inactive for N hours that need extraction
CREATE OR REPLACE FUNCTION get_conversations_needing_extraction(
  inactivity_hours INT DEFAULT 3,
  batch_limit INT DEFAULT 20
)
RETURNS TABLE(conversation_id UUID, user_id UUID) AS $$
BEGIN
  RETURN QUERY
    SELECT c.id, c.user_id
    FROM conversations c
    WHERE c.updated_at < NOW() - (inactivity_hours || ' hours')::INTERVAL
      AND (c.memory_extracted_at IS NULL OR c.memory_extracted_at < c.updated_at)
    ORDER BY c.updated_at ASC
    LIMIT batch_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get full conversation text for a conversation
CREATE OR REPLACE FUNCTION get_conversation_text(p_conversation_id UUID)
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
  msg RECORD;
BEGIN
  FOR msg IN
    SELECT m.role, m.parts, m.created_at
    FROM messages m
    WHERE m.conversation_id = p_conversation_id
    ORDER BY m.created_at ASC
  LOOP
    result := result || msg.role || ': ';
    IF msg.parts IS NOT NULL AND jsonb_array_length(msg.parts) > 0 THEN
      result := result || COALESCE(msg.parts->0->>'text', '[non-text]');
    END IF;
    result := result || E'\n';
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark conversation as extracted
CREATE OR REPLACE FUNCTION mark_conversation_extracted(p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE conversations
  SET memory_extracted_at = NOW()
  WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
