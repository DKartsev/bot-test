-- 001_create_support_schema.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Conversations store dialogue metadata
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY,
  user_telegram_id TEXT,
  status TEXT DEFAULT 'open',
  handoff TEXT DEFAULT 'bot',
  assignee_id UUID,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual messages within a conversation
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  sender TEXT,
  content TEXT,
  media_urls JSONB,
  media_types TEXT[],
  transcript TEXT,
  vision_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge base articles
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY,
  title TEXT,
  slug TEXT UNIQUE,
  body_md TEXT,
  tags TEXT[],
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chunks of KB articles with embeddings
CREATE TABLE IF NOT EXISTS kb_chunks (
  id UUID PRIMARY KEY,
  article_id UUID REFERENCES kb_articles(id),
  chunk_text TEXT,
  embedding VECTOR(1536),
  chunk_index INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log of assignments for conversations
CREATE TABLE IF NOT EXISTS assignments_log (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  operator_id UUID,
  action TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx ON conversations (last_message_at);
CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx ON messages (conversation_id, created_at);

