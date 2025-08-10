create table if not exists faq_questions (
  id uuid primary key,
  question text,
  embedding vector(1536),
  created_at timestamptz default now()
);

drop function if exists match_faq_questions;
create function match_faq_questions(
  query_embedding vector(1536),
  match_count int
)
returns table(id uuid, question text, similarity float)
language sql stable
as $$
  select id, question,
         1 - (embedding <=> query_embedding) as similarity
  from faq_questions
  order by embedding <=> query_embedding
  limit match_count;
$$;
