export interface User {
  id: string;
  name: string;
  avatar_url?: string;
  balance: number;
  deals_count: number;
  flags: string[];
  holds: string[];
  is_blocked: boolean;
  is_vip: boolean;
}

export interface Message {
  id: string;
  author: 'bot' | 'user' | 'operator';
  role: 'bot' | 'user' | 'operator';
  text: string;
  attachments?: Attachment[];
  timestamp: Date;
  metadata?: {
    source: 'telegram' | 'website' | 'p2p';
    channel?: string;
    confidence?: number;
    escalation_reason?: string;
  };
  status: 'sent' | 'delivered' | 'read';
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'audio' | 'video';
  url: string;
  size: number;
}

export interface Chat {
  id: string;
  user: User;
  last_message: Message;
  status: 'new' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'telegram' | 'website' | 'p2p';
  category: 'payment' | 'verification' | 'dispute' | 'technical' | 'general';
  unread_count: number;
  is_pinned: boolean;
  is_important: boolean;
  assigned_operator?: string;
  created_at: Date;
  updated_at: Date;
  escalation_reason?: string;
  has_attachments: boolean;
}

export interface ChatFilters {
  status?: Chat['status'][];
  source?: Chat['source'][];
  priority?: Chat['priority'][];
  category?: Chat['category'][];
  has_attachments?: boolean;
  assigned_to_me?: boolean;
}

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut?: string;
}

export interface Instruction {
  id: string;
  title: string;
  content: string;
  category: string;
}

export interface Note {
  id: string;
  chat_id: string;
  content: string;
  operator_id: string;
  created_at: Date;
}

export interface Case {
  id: string;
  chat_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  operator_id: string;
  created_at: Date;
  updated_at: Date;
}
