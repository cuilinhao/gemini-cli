import { ChatModel, MessageModel, RateLimitModel } from '@/models/chat';
import type { Chat, Message, CreateChatRequest, CreateMessageRequest } from '@/types/chat';

export class ChatService {
  // Create new chat
  static async createChat(userId: string, request: CreateChatRequest): Promise<Chat> {
    const title = request.title || `Chat ${new Date().toLocaleDateString()}`;
    return await ChatModel.create(userId, title, request.model);
  }

  // Get user chats
  static async getUserChats(userId: string): Promise<Chat[]> {
    return await ChatModel.getUserChats(userId);
  }

  // Get chat with messages
  static async getChatWithMessages(chatId: number, userId: string): Promise<{
    chat: Chat;
    messages: Message[];
  } | null> {
    const chat = await ChatModel.getById(chatId, userId);
    if (!chat) return null;

    const messages = await MessageModel.getChatMessages(chatId);
    return { chat, messages };
  }

  // Send message
  static async sendMessage(
    userId: string,
    chatId: number,
    content: string,
    model: string
  ): Promise<{ userMessage: Message; assistantMessage: Message }> {
    // Check rate limits
    const rateLimit = await RateLimitModel.checkLimit(userId);
    if (!rateLimit.allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Verify chat belongs to user
    const chat = await ChatModel.getById(chatId, userId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Create user message
    const userMessage = await MessageModel.create(chatId, 'user', content);

    // Call Gemini API
    const assistantResponse = await this.callGeminiAPI(model, content, userId);
    
    // Create assistant message
    const assistantMessage = await MessageModel.create(
      chatId,
      'assistant',
      assistantResponse.content,
      assistantResponse.tokensUsed
    );

    // Record usage
    await RateLimitModel.recordUsage(userId, assistantResponse.tokensUsed);

    return { userMessage, assistantMessage };
  }

  // Delete chat
  static async deleteChat(chatId: number, userId: string): Promise<boolean> {
    return await ChatModel.delete(chatId, userId);
  }

  // Update chat title
  static async updateChatTitle(
    chatId: number,
    userId: string,
    title: string
  ): Promise<boolean> {
    return await ChatModel.updateTitle(chatId, userId, title);
  }

  // Private method to call Gemini API
  private static async callGeminiAPI(
    model: string,
    content: string,
    userEmail: string
  ): Promise<{ content: string; tokensUsed: number }> {
    const { GeminiService } = await import('./gemini');
    
    // Check if user has API key
    const { ApiKeyService } = await import('./apikey');
    const hasApiKey = await ApiKeyService.hasApiKey(userEmail);
    
    return await GeminiService.generateText(
      userEmail,
      content,
      model,
      !hasApiKey // Use trial mode if no API key
    );
  }

  // Check if user can make requests
  static async canUserMakeRequest(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    tokensRemaining: number;
  }> {
    return await RateLimitModel.checkLimit(userId);
  }
}

export class ScriptService {
  // Generate script from user command
  static async generateScript(
    userId: string,
    command: string,
    model: string = 'gemini-1.5-flash'
  ): Promise<string> {
    // Check rate limits
    const rateLimit = await RateLimitModel.checkLimit(userId);
    if (!rateLimit.allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Extract script command
    const scriptCommand = command.replace(/^\/script\s+/, '');
    
    // Generate script with Gemini API
    const script = await this.generateWithGemini(model, scriptCommand, userId);
    
    // Record usage
    await RateLimitModel.recordUsage(userId, script.tokensUsed);
    
    return script.content;
  }

  private static async generateWithGemini(
    model: string,
    command: string,
    userEmail: string
  ): Promise<{ content: string; tokensUsed: number }> {
    const { GeminiService } = await import('./gemini');
    const { ApiKeyService } = await import('./apikey');
    
    const hasApiKey = await ApiKeyService.hasApiKey(userEmail);
    
    return await GeminiService.generateScript(
      userEmail,
      command,
      model,
      !hasApiKey // Use trial mode if no API key
    );
  }
}