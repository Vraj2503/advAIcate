-- ============================================================
-- advAIcate: Auto-Summarization Migration
-- Safe to run multiple times (uses IF NOT EXISTS / CREATE OR REPLACE)
--
-- ⚠️  RUN THIS IN SUPABASE SQL EDITOR BEFORE TESTING BUG 2
--     Dashboard → SQL Editor → New query → Paste → Run
-- ============================================================

-- === 1. chat_sessions table: Add summarization columns ===
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS rolling_summary TEXT;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS final_summary TEXT;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS last_summary_at TIMESTAMPTZ;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- === 2. messages table: Add summarization tracking columns ===
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_summarized BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS summarized_at TIMESTAMPTZ;

-- === 3. Atomic increment function ===
-- CRITICAL: Without this, message counting falls back to non-atomic
-- read-then-write which has a theoretical race condition.
-- Called via: supabase.rpc("increment_message_count", { p_session_id, p_count })
CREATE OR REPLACE FUNCTION increment_message_count(
    p_session_id UUID,
    p_count INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE chat_sessions
    SET message_count = COALESCE(message_count, 0) + p_count
    WHERE id = p_session_id
    RETURNING message_count INTO new_count;

    RETURN COALESCE(new_count, 0);
END;
$$;

-- === 4. Performance indexes ===

-- Speeds up history fetch (most recent messages first)
CREATE INDEX IF NOT EXISTS idx_messages_session_created
    ON messages(session_id, created_at DESC);

-- Speeds up unsummarized message queries
CREATE INDEX IF NOT EXISTS idx_messages_unsummarized
    ON messages(session_id, is_summarized, created_at ASC)
    WHERE is_summarized = FALSE;

-- Speeds up stale session detection
CREATE INDEX IF NOT EXISTS idx_sessions_active_updated
    ON chat_sessions(user_id, status, updated_at)
    WHERE status = 'active';

-- === 5. Backfill message_count for existing sessions ===
-- Sets message_count to actual count for any sessions that already have messages
-- but whose message_count was never tracked. Safe to re-run.
UPDATE chat_sessions cs
SET message_count = sub.cnt
FROM (
    SELECT session_id, COUNT(*) as cnt
    FROM messages
    GROUP BY session_id
) sub
WHERE cs.id = sub.session_id
  AND (cs.message_count IS NULL OR cs.message_count = 0);
