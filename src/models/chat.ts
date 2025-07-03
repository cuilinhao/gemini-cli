import { db } from '@/db';
import { chats, messages, files, limits } from '@/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import type { Chat, Message, FileRecord, RateLimit } from '@/types/chat';

export class ChatModel {
  // Create a new chat
  static async create(userId: string, title: string, model: string): Promise<Chat> {
    const [chat] = await db
      .insert(chats)
      .values({
        user_id: userId,
        title,
        model,
      })
      .returning();
    
    return chat;
  }

  // Get user's chats
  static async getUserChats(userId: string): Promise<Chat[]> {
    return await db
      .select()
      .from(chats)
      .where(eq(chats.user_id, userId))
      .orderBy(desc(chats.created_at));
  }

  // Get chat by id
  static async getById(chatId: number, userId: string): Promise<Chat | null> {
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.user_id, userId)));
    
    return chat || null;
  }

  // Delete chat
  static async delete(chatId: number, userId: string): Promise<boolean> {
    // First delete all messages
    await db
      .delete(messages)
      .where(eq(messages.chat_id, chatId));
    
    // Then delete the chat
    const result = await db
      .delete(chats)
      .where(and(eq(chats.id, chatId), eq(chats.user_id, userId)));
    
    return result.rowCount > 0;
  }

  // Update chat title
  static async updateTitle(chatId: number, userId: string, title: string): Promise<boolean> {
    const result = await db
      .update(chats)
      .set({ title })
      .where(and(eq(chats.id, chatId), eq(chats.user_id, userId)));
    
    return result.rowCount > 0;
  }
}

export class MessageModel {
  // Add message to chat
  static async create(
    chatId: number,
    role: 'user' | 'assistant' | 'system',
    content: string,
    tokenUsed?: number
  ): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        chat_id: chatId,
        role,
        content,
        token_used: tokenUsed || 0,
      })
      .returning();
    
    return message;
  }

  // Get messages for chat
  static async getChatMessages(chatId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.chat_id, chatId))
      .orderBy(messages.created_at);
  }

  // Delete message
  static async delete(messageId: number): Promise<boolean> {
    const result = await db
      .delete(messages)
      .where(eq(messages.id, messageId));
    
    return result.rowCount > 0;
  }
}

export class FileModel {
  // Upload file record
  static async create(
    userId: string,
    filename: string,
    size: number,
    url?: string,
    fileType?: string
  ): Promise<FileRecord> {
    const [file] = await db
      .insert(files)
      .values({
        user_id: userId,
        filename,
        size,
        url,
        file_type: fileType,
      })
      .returning();
    
    return file;
  }

  // Get user files
  static async getUserFiles(userId: string): Promise<FileRecord[]> {
    return await db
      .select()
      .from(files)
      .where(eq(files.user_id, userId))
      .orderBy(desc(files.created_at));
  }

  // Mark file as processed
  static async markProcessed(fileId: number): Promise<boolean> {
    const result = await db
      .update(files)
      .set({ processed: true })
      .where(eq(files.id, fileId));
    
    return result.rowCount > 0;
  }
}

export class RateLimitModel {
  // Check rate limit for user
  static async checkLimit(
    userId: string,
    windowMinutes: number = 60,
    maxRequests: number = 100,
    maxTokens: number = 10000
  ): Promise<{ allowed: boolean; remaining: number; tokensRemaining: number }> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    const [currentLimit] = await db
      .select()
      .from(limits)
      .where(
        and(
          eq(limits.user_id, userId),
          gte(limits.window_start, windowStart)
        )
      );
    
    if (!currentLimit) {
      // No limit record, user is allowed
      return {
        allowed: true,
        remaining: maxRequests - 1,
        tokensRemaining: maxTokens,
      };
    }
    
    const requestsAllowed = currentLimit.req_count < maxRequests;
    const tokensAllowed = currentLimit.token_count < maxTokens;
    
    return {
      allowed: requestsAllowed && tokensAllowed,
      remaining: Math.max(0, maxRequests - currentLimit.req_count),
      tokensRemaining: Math.max(0, maxTokens - currentLimit.token_count),
    };
  }

  // Record API usage
  static async recordUsage(
    userId: string,
    tokensUsed: number = 0
  ): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (now.getTime() % (60 * 60 * 1000))); // Hour window
    
    // Try to update existing record
    const updated = await db
      .update(limits)
      .set({
        req_count: limits.req_count + 1,
        token_count: limits.token_count + tokensUsed,
      })
      .where(
        and(
          eq(limits.user_id, userId),
          eq(limits.window_start, windowStart)
        )
      );
    
    // If no record updated, create new one
    if (updated.rowCount === 0) {
      await db
        .insert(limits)
        .values({
          user_id: userId,
          window_start: windowStart,
          req_count: 1,
          token_count: tokensUsed,
        });
    }
  }
}