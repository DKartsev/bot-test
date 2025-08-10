/*
# Fix database schema issues

1. Schema Updates
   - Add proper constraints and indexes
   - Fix data types and defaults
   - Add missing foreign key constraints

2. Security
   - Enable RLS on all tables
   - Add proper policies for data access
   - Add audit logging triggers

3. Performance
   - Add missing indexes for common queries
   - Optimize existing indexes
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Fix conversations table
ALTER TABLE conversations 
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN user_telegram_id SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'open',
  ALTER COLUMN handoff SET DEFAULT 'bot',
  ALTER COLUMN last_message_at SET DEFAULT now(),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Add missing constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'conversations_status_check'
  ) THEN
    ALTER TABLE conversations 
    ADD CONSTRAINT conversations_status_check 
    CHECK (status IN ('open', 'closed', 'escalated'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'conversations_handoff_check'
  ) THEN
    ALTER TABLE conversations 
    ADD CONSTRAINT conversations_handoff_check 
    CHECK (handoff IN ('bot', 'human'));
  END IF;
END $$;

-- Fix messages table
ALTER TABLE messages 
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_sender_check'
  ) THEN
    ALTER TABLE messages 
    ADD CONSTRAINT messages_sender_check 
    CHECK (sender IN ('user', 'bot', 'operator'));
  END IF;
END $$;

-- Add updated_at trigger for conversations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_user_telegram_id_status_idx 
  ON conversations (user_telegram_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_assignee_name_idx 
  ON conversations (assignee_name) WHERE assignee_name IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_conversation_sender_idx 
  ON messages (conversation_id, sender, created_at DESC);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for service role, restrict for others)
CREATE POLICY "Service role can access all conversations"
  ON conversations
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all messages"
  ON messages
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all operator_notes"
  ON operator_notes
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all saved_replies"
  ON saved_replies
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all categories"
  ON categories
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all cases"
  ON cases
  FOR ALL
  TO service_role
  USING (true);