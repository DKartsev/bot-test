create table if not exists user_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  question_id uuid not null references faq_questions(id),
  action text check (action in ('view','answer','feedback_like','feedback_dislike')),
  created_at timestamptz default now()
);

create index if not exists user_interactions_user_idx on user_interactions(user_id);
create index if not exists user_interactions_question_idx on user_interactions(question_id);
