-- 007_add_conversation_assignee.sql
ALTER TABLE conversations
  ADD COLUMN assignee_name TEXT,
  ADD COLUMN assigned_at TIMESTAMPTZ;
