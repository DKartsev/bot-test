export interface User {
  id: string;
  telegram_id: string;
  username?: string;
  first_name: string;
  last_name?: string;
  avatar_url?: string;
  balance: number;
  deals_count: number;
  flags: string[];
  is_blocked: boolean;
  is_verified: boolean;
  created_at: string;
  last_activity: string;
}

export interface Message {
  id: string;
  chat_id: string;
  conversation_id: string;
  sender: string;
  content: string;
  text: string;
  author_type: 'user' | 'bot' | 'operator';
  author_id: string;
  timestamp: string;
  is_read: boolean;
  media_urls?: any[];
  media_types?: string[];
  transcript?: string;
  vision_summary?: string;
  created_at: string;
  metadata?: {
    source: string;
    channel: string;
    media_urls?: any[];
    media_types?: string[];
  };
}

export interface Chat {
  id: string;
  user_id: string;
  user: User;
  last_message: Message | null;
  status: 'waiting' | 'in_progress' | 'closed' | 'waiting_for_operator';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'telegram' | 'website' | 'p2p';
  operator_id?: string;
  is_pinned: boolean;
  is_important: boolean;
  unread_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  escalation_reason?: string;
}

export interface Operator {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'operator' | 'admin' | 'supervisor';
  is_active: boolean;
  max_chats: number;
  password_hash?: string;
  created_at: string;
  last_activity?: string;
  last_login?: string;
}

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  shortcut?: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  chat_id: string;
  conversation_id: string;
  content: string;
  author_id: string;
  author_name: string;
  type: 'internal' | 'public' | 'resolution';
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  chat_id: string;
  conversation_id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface FilterOptions {
  status?: string[];
  source?: string[];
  priority?: string[];
  has_attachments?: boolean;
  operator_id?: string;
  user_id?: string;
  page?: number;
  limit?: number;
}

export interface DatabaseStatus {
  status: string;
  tables: {
    users: number;
    conversations: number;
    messages: number;
    operators: number;
  };
}

export interface ChatStats {
  total_chats: number;
  waiting_chats: number;
  in_progress_chats: number;
  closed_chats: number;
  avg_response_time: number;
  avg_resolution_time: number;
}

export interface Attachment {
  id: string;
  conversation_id: string;
  message_id?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  original_name: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  telegram_id: string;
  username?: string;
  first_name: string;
  last_name?: string;
  avatar_url?: string;
  balance?: number;
  deals_count?: number;
  flags?: string[];
  is_blocked?: boolean;
  is_verified?: boolean;
  created_at?: string;
  last_activity?: string;
}

export interface UpdateUserData {
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  balance?: number;
  deals_count?: number;
  flags?: string[];
  is_blocked?: boolean;
  is_verified?: boolean;
  last_activity?: string;
}
