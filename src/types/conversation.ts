export interface Conversation {
  id: string;
  user_telegram_id: string;
  chat_telegram_id?: string;
  username?: string | null;
  status: 'open' | 'closed' | 'escalated';
  handoff: 'bot' | 'human';
  assignee_id?: string | null;
  assignee_name?: string | null;
  assigned_at?: string | null;
  category_id?: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'bot' | 'operator';
  content: string | null;
  media_urls?: string[] | null;
  media_types?: string[] | null;
  transcript?: string | null;
  vision_summary?: string | null;
  created_at: string;
}

export interface OperatorNote {
  id: string;
  conversation_id: string;
  message_id?: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface SavedReply {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_by?: string | null;
  updated_at: string;
}

export interface Case {
  id: string;
  conversation_id: string;
  title: string;
  summary: string;
  link: string;
  created_by?: string | null;
  created_at: string;
}