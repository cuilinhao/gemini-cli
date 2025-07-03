import { NextResponse } from 'next/server';
import { ChatService } from '@/services/chat';
import { getSession } from '@/auth';

// GET /api/user/limits - Check user rate limits
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limits = await ChatService.canUserMakeRequest(session.user.email);
    
    return NextResponse.json(limits);
  } catch (error) {
    console.error('Error checking limits:', error);
    return NextResponse.json(
      { error: 'Failed to check limits' },
      { status: 500 }
    );
  }
}