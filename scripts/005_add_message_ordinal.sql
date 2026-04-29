-- 005_add_message_ordinal.sql
-- Adds an ordinal column to the messages table for deterministic ordering.
-- This prevents message reordering when batch-inserted messages share the
-- same created_at timestamp.

-- Step 1: Add the column (nullable first to backfill)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS ordinal INTEGER;

-- Step 2: Backfill ordinals for existing messages based on created_at order
-- Each conversation's messages get sequential ordinals 0, 1, 2, ...
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at ASC, id ASC) - 1 AS rn
  FROM public.messages
)
UPDATE public.messages m
SET ordinal = numbered.rn
FROM numbered
WHERE m.id = numbered.id AND m.ordinal IS NULL;

-- Step 3: Set NOT NULL + default after backfill
ALTER TABLE public.messages ALTER COLUMN ordinal SET NOT NULL;
ALTER TABLE public.messages ALTER COLUMN ordinal SET DEFAULT 0;

-- Step 4: Replace the old index with an ordinal-based one
DROP INDEX IF EXISTS messages_conv_idx;
CREATE INDEX IF NOT EXISTS messages_conv_idx
  ON public.messages(conversation_id, ordinal ASC);
