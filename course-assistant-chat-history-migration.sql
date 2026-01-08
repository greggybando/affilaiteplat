-- Course Assistant Chat History Migration
-- Saves user conversations with the AI assistant

-- Conversations table (one per user session/thread)
CREATE TABLE IF NOT EXISTS course_assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  lesson_id TEXT, -- Optional: which lesson this conversation is about
  lesson_title TEXT, -- Optional: display name
  module_name TEXT, -- Optional: module name
  title TEXT, -- Auto-generated from first message (e.g., "What project can I make?")
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table (individual messages in a conversation)
CREATE TABLE IF NOT EXISTS course_assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES course_assistant_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_assistant_conversations_user_id ON course_assistant_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_course_assistant_conversations_updated_at ON course_assistant_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_assistant_messages_conversation_id ON course_assistant_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_course_assistant_messages_created_at ON course_assistant_messages(created_at ASC);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_course_assistant_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE course_assistant_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_course_assistant_conversation_updated_at
  AFTER INSERT ON course_assistant_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_course_assistant_conversation_updated_at();






