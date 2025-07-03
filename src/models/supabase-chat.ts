import { supabase, createServiceSupabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Chat = Database['public']['Tables']['chats']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type FileRecord = Database['public']['Tables']['files']['Row'];
type UsageStats = Database['public']['Tables']['usage_stats']['Row'];
type RateLimit = Database['public']['Tables']['rate_limits']['Row'];

export class SupabaseChatModel {
  // 创建新聊天
  static async create(userId: string, title: string, model: string): Promise<Chat> {
    const { data, error } = await supabase
      .from('chats')
      .insert({
        user_id: userId,
        title,
        model,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating chat:', error);
      throw new Error('Failed to create chat');
    }

    return data;
  }

  // 获取用户聊天列表
  static async getUserChats(userId: string): Promise<Chat[]> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user chats:', error);
      throw new Error('Failed to fetch chats');
    }

    return data || [];
  }

  // 根据ID获取聊天
  static async getById(chatId: number, userId: string): Promise<Chat | null> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 未找到记录
      }
      console.error('Error fetching chat:', error);
      throw new Error('Failed to fetch chat');
    }

    return data;
  }

  // 删除聊天
  static async delete(chatId: number, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting chat:', error);
      throw new Error('Failed to delete chat');
    }

    return true;
  }

  // 更新聊天标题
  static async updateTitle(chatId: number, userId: string, title: string): Promise<boolean> {
    const { error } = await supabase
      .from('chats')
      .update({ title })
      .eq('id', chatId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating chat title:', error);
      throw new Error('Failed to update chat title');
    }

    return true;
  }
}

export class SupabaseMessageModel {
  // 添加消息到聊天
  static async create(
    chatId: number,
    role: 'user' | 'assistant' | 'system',
    content: string,
    tokensUsed?: number
  ): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        role,
        content,
        tokens_used: tokensUsed || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);
      throw new Error('Failed to create message');
    }

    return data;
  }

  // 获取聊天消息
  static async getChatMessages(chatId: number): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching chat messages:', error);
      throw new Error('Failed to fetch messages');
    }

    return data || [];
  }

  // 删除消息
  static async delete(messageId: number): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }

    return true;
  }
}

export class SupabaseFileModel {
  // 创建文件记录
  static async create(
    userId: string,
    filename: string,
    size: number,
    url?: string,
    fileType?: string
  ): Promise<FileRecord> {
    const { data, error } = await supabase
      .from('files')
      .insert({
        user_id: userId,
        filename,
        file_size: size,
        file_url: url,
        file_type: fileType,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating file record:', error);
      throw new Error('Failed to create file record');
    }

    return data;
  }

  // 获取用户文件
  static async getUserFiles(userId: string): Promise<FileRecord[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user files:', error);
      throw new Error('Failed to fetch files');
    }

    return data || [];
  }

  // 标记文件为已处理
  static async markProcessed(fileId: number): Promise<boolean> {
    const { error } = await supabase
      .from('files')
      .update({ processed: true })
      .eq('id', fileId);

    if (error) {
      console.error('Error marking file as processed:', error);
      throw new Error('Failed to update file status');
    }

    return true;
  }
}

export class SupabaseRateLimitModel {
  // 检查速率限制
  static async checkLimit(
    userId: string,
    windowMinutes: number = 60,
    maxRequests: number = 100,
    maxTokens: number = 10000
  ): Promise<{ allowed: boolean; remaining: number; tokensRemaining: number }> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const { data, error } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .gte('window_start', windowStart.toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking rate limit:', error);
      // 如果出错，允许请求但记录错误
    }

    if (!data) {
      // 没有限制记录，用户被允许
      return {
        allowed: true,
        remaining: maxRequests - 1,
        tokensRemaining: maxTokens,
      };
    }

    const requestsAllowed = (data.request_count || 0) < maxRequests;
    const tokensAllowed = (data.token_count || 0) < maxTokens;

    return {
      allowed: requestsAllowed && tokensAllowed,
      remaining: Math.max(0, maxRequests - (data.request_count || 0)),
      tokensRemaining: Math.max(0, maxTokens - (data.token_count || 0)),
    };
  }

  // 记录API使用
  static async recordUsage(userId: string, tokensUsed: number = 0): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (now.getTime() % (60 * 60 * 1000))); // 小时窗口

    // 尝试更新现有记录
    const { data: existingRecord } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('window_start', windowStart.toISOString())
      .single();

    if (existingRecord) {
      // 更新现有记录
      const { error } = await supabase
        .from('rate_limits')
        .update({
          request_count: (existingRecord.request_count || 0) + 1,
          token_count: (existingRecord.token_count || 0) + tokensUsed,
        })
        .eq('id', existingRecord.id);

      if (error) {
        console.error('Error updating rate limit:', error);
      }
    } else {
      // 创建新记录
      const { error } = await supabase
        .from('rate_limits')
        .insert({
          user_id: userId,
          window_start: windowStart.toISOString(),
          request_count: 1,
          token_count: tokensUsed,
        });

      if (error) {
        console.error('Error creating rate limit record:', error);
      }
    }
  }
}

export class SupabaseUsageStatsModel {
  // 记录使用统计
  static async recordUsage(
    userId: string,
    model: string,
    tokensUsed: number,
    requestType: string = 'chat',
    estimatedCostCents: number = 0,
    promptTokens: number = 0,
    completionTokens: number = 0
  ): Promise<void> {
    const { error } = await supabase
      .from('usage_stats')
      .insert({
        user_id: userId,
        model,
        tokens_used: tokensUsed,
        estimated_cost: estimatedCostCents,
        request_type: requestType,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      });

    if (error) {
      console.error('Error recording usage stats:', error);
      // 不抛出错误，避免影响主要功能
    }
  }

  // 获取用户使用统计
  static async getUserStats(userId: string): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    requestsToday: number;
    tokensToday: number;
    costToday: number;
    requestsThisMonth: number;
    tokensThisMonth: number;
    costThisMonth: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 使用服务端客户端执行聚合查询
    const serviceSupabase = createServiceSupabase();

    try {
      // 全部统计
      const { data: totalData } = await serviceSupabase
        .from('usage_stats')
        .select('tokens_used, estimated_cost')
        .eq('user_id', userId);

      // 今日统计
      const { data: todayData } = await serviceSupabase
        .from('usage_stats')
        .select('tokens_used, estimated_cost')
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString());

      // 本月统计
      const { data: monthData } = await serviceSupabase
        .from('usage_stats')
        .select('tokens_used, estimated_cost')
        .eq('user_id', userId)
        .gte('created_at', monthStart.toISOString());

      // 计算汇总
      const totalRequests = totalData?.length || 0;
      const totalTokens = totalData?.reduce((sum, row) => sum + (row.tokens_used || 0), 0) || 0;
      const totalCost = totalData?.reduce((sum, row) => sum + (row.estimated_cost || 0), 0) || 0;

      const requestsToday = todayData?.length || 0;
      const tokensToday = todayData?.reduce((sum, row) => sum + (row.tokens_used || 0), 0) || 0;
      const costToday = todayData?.reduce((sum, row) => sum + (row.estimated_cost || 0), 0) || 0;

      const requestsThisMonth = monthData?.length || 0;
      const tokensThisMonth = monthData?.reduce((sum, row) => sum + (row.tokens_used || 0), 0) || 0;
      const costThisMonth = monthData?.reduce((sum, row) => sum + (row.estimated_cost || 0), 0) || 0;

      return {
        totalRequests,
        totalTokens,
        totalCost: totalCost / 100, // 转换为美元
        requestsToday,
        tokensToday,
        costToday: costToday / 100,
        requestsThisMonth,
        tokensThisMonth,
        costThisMonth: costThisMonth / 100,
      };
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        requestsToday: 0,
        tokensToday: 0,
        costToday: 0,
        requestsThisMonth: 0,
        tokensThisMonth: 0,
        costThisMonth: 0,
      };
    }
  }
}