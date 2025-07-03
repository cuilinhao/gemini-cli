import { NextRequest, NextResponse } from 'next/server';
import { TrialModeService } from '@/services/trial-mode';

// GET /api/trial/stats - Get trial user statistics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    if (!TrialModeService.isTrialUser(userId)) {
      return NextResponse.json({ error: 'Not a trial user' }, { status: 400 });
    }

    const stats = await TrialModeService.getTrialUserStats(userId);
    const shouldPromptUpgrade = TrialModeService.shouldPromptUpgrade(stats);
    
    return NextResponse.json({
      ...stats,
      shouldPromptUpgrade,
      limits: TrialModeService.getTrialLimits(),
    });
  } catch (error) {
    console.error('Error fetching trial stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trial statistics' },
      { status: 500 }
    );
  }
}