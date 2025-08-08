-- conversations: все диалоги
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_telegram_id text not null,
  status text default 'open', -- open, in_progress, resolved, escalated
  handoff text default 'bot', -- bot, operator
  assignee_id uuid, -- оператор, если назначен
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);

-- messages: сообщения в диалоге
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender text not null, -- user, bot, operator
  content text,
  media_urls jsonb, -- { photo: [...], video: [...], audio: [...] }
  media_types text[], -- ["photo", "audio"]
  transcript text, -- если голосовое/видео
  vision_summary text, -- если фото/видео
  created_at timestamptz default now()
);

-- kb_articles: статьи базы знаний
create table kb_articles (
  id uuid primary key default gen_random_uuid(),
  title text,
  slug text unique,
  body_md text,
  tags text[],
  updated_at timestamptz default now()
);

-- kb_chunks: чанки с эмбеддингами
create table kb_chunks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references kb_articles(id) on delete cascade,
  chunk_text text,
  embedding vector(1536), -- pgvector
  chunk_index int,
  created_at timestamptz default now()
);

-- assignments_log: лог переключений
create table assignments_log (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id),
  operator_id uuid,
  action text, -- assign, release, auto_release
  created_at timestamptz default now()
);
