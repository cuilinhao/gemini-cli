import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/auth/supabase-config';
import { SupabaseUsageStatsService } from '@/services/supabase-usage-stats';

// GET /api/usage/stats - Get user usage statistics
export async function GET(request: NextRequest) {
  try {
    const { user: session } = await getSession();
    
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await SupabaseUsageStatsService.getUserStats(session.email);
    const alerts = await SupabaseUsageStatsService.getUserAlerts(session.email);
    const settings = await SupabaseUsageStatsService.getUserCostSettings(session.email);
    
    return NextResponse.json({
      stats,
      alerts,
      settings,
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    );
  }
}

// POST /api/usage/stats - Update cost settings
export async function POST(request: NextRequest) {
  try {
    const { user: session } = await getSession();
    
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;
    
    if (!settings) {
      return NextResponse.json({ error: 'Settings are required' }, { status: 400 });
    }

    await SupabaseUsageStatsService.updateUserCostSettings(session.email, settings);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating cost settings:', error);
    return NextResponse.json(
      { error: 'Failed to update cost settings' },
      { status: 500 }
    );
  }
}