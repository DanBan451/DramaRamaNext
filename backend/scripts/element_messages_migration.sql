-- Migration: Add element_messages table for per-element conversation history
-- Part of Stockfish v2: each element prompt gets its own conversation thread

-- Create the element_messages table
CREATE TABLE IF NOT EXISTS element_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    prompt_index INTEGER NOT NULL CHECK (prompt_index >= 0 AND prompt_index <= 12),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_element_messages_session_id ON element_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_element_messages_session_prompt ON element_messages(session_id, prompt_index, created_at);

-- Enable RLS
ALTER TABLE element_messages ENABLE ROW LEVEL SECURITY;

-- RLS policy: service role can do everything
CREATE POLICY "Service role full access on element_messages"
    ON element_messages
    FOR ALL
    USING (true)
    WITH CHECK (true);
