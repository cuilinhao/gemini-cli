import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyService } from '@/services/apikey';
import { getSession } from '@/auth';

// GET /api/user/api-key - Check if user has API key
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasKey = await ApiKeyService.hasApiKey(session.user.email);
    
    return NextResponse.json({ hasApiKey: hasKey });
  } catch (error) {
    console.error('Error checking API key:', error);
    return NextResponse.json(
      { error: 'Failed to check API key' },
      { status: 500 }
    );
  }
}

// POST /api/user/api-key - Store API key
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey } = body;

    // Validate API key format
    const validation = ApiKeyService.validateApiKeyFormat(apiKey);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Test API key
    const testResult = await ApiKeyService.testApiKey(apiKey);
    if (!testResult.valid) {
      return NextResponse.json({ error: testResult.error }, { status: 400 });
    }

    // Store the API key
    const stored = await ApiKeyService.storeApiKey(session.user.email, apiKey);
    if (!stored) {
      return NextResponse.json(
        { error: 'Failed to store API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing API key:', error);
    return NextResponse.json(
      { error: 'Failed to store API key' },
      { status: 500 }
    );
  }
}

// DELETE /api/user/api-key - Delete API key
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deleted = await ApiKeyService.deleteApiKey(session.user.email);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}