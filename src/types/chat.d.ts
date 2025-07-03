export interface Chat {
  id: number;
  user_id: string;
  title?: string;
  model: string;
  created_at?: Date;
}

export interface Message {
  id: number;
  chat_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  token_used?: number;
  created_at?: Date;
}

export interface FileRecord {
  id: number;
  user_id: string;
  filename: string;
  size: number;
  url?: string;
  file_type?: string;
  processed?: boolean;
  created_at?: Date;
}

export interface RateLimit {
  id: number;
  user_id: string;
  window_start: Date;
  req_count?: number;
  token_count?: number;
  created_at?: Date;
}

export interface CreateChatRequest {
  title?: string;
  model: string;
}

export interface CreateMessageRequest {
  chat_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  token_used?: number;
}

export interface GeminiModel {
  id: string;
  name: string;
  description?: string;
  max_tokens?: number;
}