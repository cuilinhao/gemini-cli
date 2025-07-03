import { createClient } from '@supabase/supabase-js';

// Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// 服务端Supabase客户端（使用service key）
export const createServiceSupabase = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not found, using anon key for service operations');
    return supabase; // 临时使用anon key
  }
  
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// 数据库类型定义
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          nickname: string | null;
          avatar_url: string | null;
          api_key_enc: string | null;
          cost_settings: any | null;
          locale: string | null;
          signin_provider: string | null;
          invite_code: string | null;
          invited_by: string | null;
          is_affiliate: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          nickname?: string | null;
          avatar_url?: string | null;
          api_key_enc?: string | null;
          cost_settings?: any | null;
          locale?: string | null;
          signin_provider?: string | null;
          invite_code?: string | null;
          invited_by?: string | null;
          is_affiliate?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          nickname?: string | null;
          avatar_url?: string | null;
          api_key_enc?: string | null;
          cost_settings?: any | null;
          locale?: string | null;
          signin_provider?: string | null;
          invite_code?: string | null;
          invited_by?: string | null;
          is_affiliate?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      chats: {
        Row: {
          id: number;
          user_id: string;
          title: string | null;
          model: string;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          title?: string | null;
          model: string;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          title?: string | null;
          model?: string;
          created_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: number;
          chat_id: number;
          role: string;
          content: string;
          tokens_used: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          chat_id: number;
          role: string;
          content: string;
          tokens_used?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          chat_id?: number;
          role?: string;
          content?: string;
          tokens_used?: number | null;
          created_at?: string | null;
        };
      };
      files: {
        Row: {
          id: number;
          user_id: string;
          filename: string;
          file_size: number;
          file_url: string | null;
          file_type: string | null;
          processed: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          filename: string;
          file_size: number;
          file_url?: string | null;
          file_type?: string | null;
          processed?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          filename?: string;
          file_size?: number;
          file_url?: string | null;
          file_type?: string | null;
          processed?: boolean | null;
          created_at?: string | null;
        };
      };
      rate_limits: {
        Row: {
          id: number;
          user_id: string;
          window_start: string;
          request_count: number | null;
          token_count: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          window_start: string;
          request_count?: number | null;
          token_count?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          window_start?: string;
          request_count?: number | null;
          token_count?: number | null;
          created_at?: string | null;
        };
      };
      usage_stats: {
        Row: {
          id: number;
          user_id: string;
          model: string;
          tokens_used: number | null;
          estimated_cost: number | null;
          request_type: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          model: string;
          tokens_used?: number | null;
          estimated_cost?: number | null;
          request_type?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          model?: string;
          tokens_used?: number | null;
          estimated_cost?: number | null;
          request_type?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          created_at?: string | null;
        };
      };
    };
  };
};