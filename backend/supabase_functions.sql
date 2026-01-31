-- SQL Functions for Supabase Vector Similarity Search
-- Run these in your Supabase SQL Editor

-- 1. Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create storage bucket for user documents (run this in Supabase Dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-documents', 'user-documents', false);

-- 3. Function to search similar conversation summaries
CREATE OR REPLACE FUNCTION match_conversation_summaries(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  summary_text text,
  summary_level text,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.session_id,
    cs.summary_text,
    cs.summary_level,
    cs.created_at,
    1 - (cs.embedding <=> query_embedding) as similarity
  FROM conversation_summaries cs
  INNER JOIN chat_sessions s ON cs.session_id = s.id
  WHERE 
    cs.embedding IS NOT NULL
    AND (user_id_filter IS NULL OR s.user_id = user_id_filter)
    AND 1 - (cs.embedding <=> query_embedding) > match_threshold
  ORDER BY cs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Function to search similar user documents
CREATE OR REPLACE FUNCTION match_user_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  user_id_filter uuid DEFAULT NULL,
  session_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  session_id uuid,
  file_name text,
  content text,
  storage_path text,
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ud.id,
    ud.user_id,
    ud.session_id,
    ud.file_name,
    ud.content,
    ud.storage_path,
    ud.metadata,
    ud.created_at,
    1 - (ud.embedding <=> query_embedding) as similarity
  FROM user_documents ud
  WHERE 
    ud.embedding IS NOT NULL
    AND (user_id_filter IS NULL OR ud.user_id = user_id_filter)
    AND (session_id_filter IS NULL OR ud.session_id = session_id_filter)
    AND 1 - (ud.embedding <=> query_embedding) > match_threshold
  ORDER BY ud.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Function to search similar document insights (chunks)
CREATE OR REPLACE FUNCTION match_document_insights(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  user_id_filter uuid DEFAULT NULL,
  session_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  insight_type text,
  content text,
  created_at timestamptz,
  similarity float,
  file_name text,
  user_id uuid,
  session_id uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    di.id,
    di.document_id,
    di.insight_type,
    di.content,
    di.created_at,
    1 - (di.embedding <=> query_embedding) as similarity,
    ud.file_name,
    ud.user_id,
    ud.session_id
  FROM document_insights di
  INNER JOIN user_documents ud ON di.document_id = ud.id
  WHERE 
    di.embedding IS NOT NULL
    AND (user_id_filter IS NULL OR ud.user_id = user_id_filter)
    AND (session_id_filter IS NULL OR ud.session_id = session_id_filter)
    AND 1 - (di.embedding <=> query_embedding) > match_threshold
  ORDER BY di.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS conversation_summaries_embedding_idx ON conversation_summaries 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS user_documents_embedding_idx ON user_documents 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS document_insights_embedding_idx ON document_insights 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 7. Create indexes on foreign keys for better join performance
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_session_id ON user_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_session_id ON conversation_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_document_insights_document_id ON document_insights(document_id);

-- 8. Add Row Level Security (RLS) policies for user_documents table
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON user_documents FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own documents"
  ON user_documents FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- 9. Add RLS policies for chat_sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- 10. Add RLS policies for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their sessions"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert messages to their sessions"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id::text = auth.uid()::text
    )
  );
