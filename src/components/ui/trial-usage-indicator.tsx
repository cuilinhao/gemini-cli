'use client';

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Zap } from 'lucide-react';

interface TrialUsageIndicatorProps {
  userId: string;
  isTrialMode: boolean;
  className?: string;
}

interface TrialStats {
  requestsToday: number;
  tokensToday: number;
  requestsRemaining: number;
  tokensRemaining: number;
  resetTime: string;
  shouldPromptUpgrade: boolean;
  limits: {
    maxTokensPerDay: number;
    maxRequestsPerDay: number;
  };
}

export default function TrialUsageIndicator({ 
  userId, 
  isTrialMode, 
  className = '' 
}: TrialUsageIndicatorProps) {
  const [stats, setStats] = useState<TrialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTrialMode || !userId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/trial/stats?userId=${encodeURIComponent(userId)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch trial stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId, isTrialMode]);

  if (!isTrialMode || loading) {
    return null;
  }

  if (error || !stats) {
    return (
      <Card className={`border-orange-200 ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Unable to load trial stats</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const requestsUsed = stats.requestsToday;
  const tokensUsed = stats.tokensToday;
  const requestsPercent = (requestsUsed / stats.limits.maxRequestsPerDay) * 100;
  const tokensPercent = (tokensUsed / stats.limits.maxTokensPerDay) * 100;

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'text-red-600';
    if (percent >= 70) return 'text-orange-600';
    return 'text-green-600';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const resetTime = new Date(stats.resetTime);
  const timeUntilReset = resetTime.getTime() - Date.now();
  const hoursUntilReset = Math.ceil(timeUntilReset / (1000 * 60 * 60));

  return (
    <Card className={`border-blue-200 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-600" />
          Trial Usage Today
          <Badge variant="outline" className="ml-auto">
            Free
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Requests Usage */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span>Requests</span>
            <span className={getUsageColor(requestsPercent)}>
              {requestsUsed} / {stats.limits.maxRequestsPerDay}
            </span>
          </div>
          <Progress 
            value={requestsPercent} 
            className="h-2"
            style={{
              '--progress-bg': getProgressColor(requestsPercent)
            } as any}
          />
        </div>

        {/* Tokens Usage */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span>Tokens</span>
            <span className={getUsageColor(tokensPercent)}>
              {tokensUsed} / {stats.limits.maxTokensPerDay}
            </span>
          </div>
          <Progress 
            value={tokensPercent} 
            className="h-2"
            style={{
              '--progress-bg': getProgressColor(tokensPercent)
            } as any}
          />
        </div>

        {/* Reset Time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            Resets in {hoursUntilReset}h
          </span>
        </div>

        {/* Upgrade Prompt */}
        {stats.shouldPromptUpgrade && (
          <div className="pt-2 border-t">
            <Button 
              size="sm" 
              className="w-full text-xs" 
              onClick={() => window.location.href = '/auth/signin'}
            >
              Upgrade for Unlimited Usage
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}