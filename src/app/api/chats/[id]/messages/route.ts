import { NextRequest, NextResponse } from 'next/server';
import { ChatService, ScriptService } from '@/services/chat';
import { getSession } from '@/auth';

interface Params {
  id: string;
}

// POST /api/chats/[id]/messages - Send message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chatId = parseInt(id);
    if (isNaN(chatId)) {
      return NextResponse.json({ error: 'Invalid chat ID' }, { status: 400 });
    }

    const body = await request.json();
    const { content, model = 'gemini-1.5-pro' } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Check if it's a script command
    if (content.startsWith('/script ')) {
      try {
        const script = await ScriptService.generateScript(
          session.user.email,
          content,
          model
        );
        
        // Create user message
        const userMessage = await ChatService.sendMessage(
          session.user.email,
          chatId,
          content,
          model
        );

        // Create assistant message with script
        const assistantMessage = await ChatService.sendMessage(
          session.user.email,
          chatId,
          `Here's the generated script:\n\n\`\`\`bash\n${script}\n\`\`\``,
          model
        );

        return NextResponse.json({
          messages: [userMessage.userMessage, assistantMessage.assistantMessage]
        });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Script generation failed' },
          { status: 500 }
        );
      }
    }

    // Regular message
    try {
      const result = await ChatService.sendMessage(
        session.user.email,
        chatId,
        content,
        model
      );

      return NextResponse.json({
        messages: [result.userMessage, result.assistantMessage]
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to send message' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}