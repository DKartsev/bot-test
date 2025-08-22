export interface User {
  id: number;
  telegram_id: number;
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
  id: number;
  chat_id: number;
  author_type: 'bot' | 'user' | 'operator';
  author_id?: number;
  text: string;
  attachments?: Attachment[];
  timestamp: string;
  is_read: boolean;
  metadata?: {
    confidence?: number;
    intent?: string;
    source: 'telegram' | 'website' | 'p2p';
    channel?: string;
  };
}

export interface Attachment {
  id: number;
  type: 'image' | 'document' | 'video' | 'audio';
  url: string;
  filename: string;
  size: number;
  mime_type: string;
}

export interface Chat {
  id: number;
  user: User;
  last_message: Message;
  status: 'waiting' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'telegram' | 'website' | 'p2p';
  operator_id?: number;
  is_pinned: boolean;
  is_important: boolean;
  unread_count: number;
  created_at: string;
  updated_at: string;
  escalation_reason?: string;
  tags: string[];
}

export interface Operator {
  id: number;
  name: string;
  email: string;
  role: 'operator' | 'senior_operator' | 'admin';
  avatar_url?: string;
  is_online: boolean;
  last_activity: string;
}

export interface CannedResponse {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  shortcut?: string;
}

export interface Note {
  id: number;
  chat_id: number;
  operator_id: number;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface Case {
  id: number;
  chat_id: number;
  operator_id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface FilterOptions {
  status?: string[];
  source?: string[];
  priority?: string[];
  tags?: string[];
  has_attachments?: boolean;
  operator_id?: number;
  date_from?: string;
  date_to?: string;
}
