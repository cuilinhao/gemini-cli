import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/gemini';
import { getSession } from '@/auth/supabase-config';

export async function POST(request: NextRequest) {
  try {
    const { user: session } = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
    }

    // 测试 API 连接
    const testResult = await GeminiService.testApiConnection(apiKey);
    
    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: testResult.message,
        details: testResult.details
      });
    } else {
      return NextResponse.json({
        success: false,
        message: testResult.message,
        details: testResult.details
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({
      success: false,
      message: '测试过程中发生错误',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}