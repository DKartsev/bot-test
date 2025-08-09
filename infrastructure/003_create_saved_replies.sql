-- 003_create_saved_replies.sql

CREATE TABLE IF NOT EXISTS saved_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS saved_replies_title_idx ON saved_replies (title);
CREATE INDEX IF NOT EXISTS saved_replies_tags_idx ON saved_replies USING GIN (tags);
