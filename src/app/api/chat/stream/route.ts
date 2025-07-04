import { NextRequest } from 'next/server';
import { GeminiService } from '@/services/gemini';
import { SupabaseUserService } from '@/services/supabase-user';
import { SupabaseRateLimitModel } from '@/models/supabase-chat';
import { SupabaseUsageStatsService } from '@/services/supabase-usage-stats';
import { getSession } from '@/auth/supabase-config';

// 导入代理配置 - 确保 API 请求通过代理
import '@/lib/proxy';

export async function POST(request: NextRequest) {
  try {
    const { user: session } = await getSession();
    const body = await request.json();
    const { message, model = 'gemini-1.5-pro', userId, isTrialMode = false } = body;

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // For trial mode, allow access without session
    let userIdentifier: string;
    if (isTrialMode && userId) {
      userIdentifier = userId;
    } else if (session?.email) {
      userIdentifier = session.email;
    } else {
      return new Response('Unauthorized', { status: 401 });
    }

    // Check rate limits
    const rateLimit = await SupabaseRateLimitModel.checkLimit(userIdentifier);
    if (!rateLimit.allowed) {
      return new Response('Rate limit exceeded', { status: 429 });
    }

    // Check if user has API key (skip for trial mode)
    const hasApiKey = !isTrialMode && session?.id && await SupabaseUserService.hasApiKey(session.id);

    // Check budget limits for authenticated users
    if (!isTrialMode && session?.email) {
      try {
        const budgetCheck = await SupabaseUsageStatsService.checkBudgetLimits(session.email);
        if (budgetCheck.dailyLimitExceeded) {
          return new Response('Daily budget limit exceeded', { status: 429 });
        }
        if (budgetCheck.monthlyLimitExceeded) {
          return new Response('Monthly budget limit exceeded', { status: 429 });
        }
      } catch (error) {
        console.warn('Budget check failed, proceeding:', error);
      }
    }

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = GeminiService.generateStreamingText(
            userIdentifier,
            message,
            model,
            isTrialMode || !hasApiKey // Use trial mode if specified or no API key
          );

          let finalResult: any = null;
          
          // Manually iterate through the generator to get both chunks and final result
          try {
            let result = await generator.next();
            while (!result.done) {
              const chunk = result.value;
              const data = `data: ${JSON.stringify({ chunk })}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
              result = await generator.next();
            }
            
            // Now we have the final result
            if (result.value) {
              finalResult = result.value;
              await SupabaseRateLimitModel.recordUsage(userIdentifier, finalResult.tokensUsed);
            }
          } catch (error) {
            console.error('Error consuming generator:', error);
          }

          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = `data: ${JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}