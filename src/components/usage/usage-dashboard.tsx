'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  AlertTriangle, 
  Settings,
  Calendar,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
  requestsToday: number;
  tokensToday: number;
  costToday: number;
  requestsThisMonth: number;
  tokensThisMonth: number;
  costThisMonth: number;
  averageTokensPerRequest: number;
  topModelsUsed: Array<{
    model: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
  dailyUsage: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

interface CostSettings {
  monthlyBudget: number;
  dailyBudget: number;
  alertThreshold: number;
  costPerToken: {
    'gemini-1.5-pro': number;
    'gemini-1.5-flash': number;
    'gemini-pro': number;
  };
}

interface Alert {
  type: 'daily_limit' | 'monthly_limit' | 'threshold_warning';
  message: string;
  severity: 'info' | 'warning' | 'error';
  percentage: number;
}

export default function UsageDashboard() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [settings, setSettings] = useState<CostSettings | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/usage/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }
      const data = await response.json();
      setStats(data.stats);
      setSettings(data.settings);
      setAlerts(data.alerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<CostSettings>) => {
    try {
      setSaving(true);
      const response = await fetch('/api/usage/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      await fetchUsageData(); // Refresh alerts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatNumber = (num: number) => num.toLocaleString();

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Alert className="border-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!stats || !settings) return null;

  const dailyBudgetUsed = (stats.costToday / settings.dailyBudget) * 100;
  const monthlyBudgetUsed = (stats.costThisMonth / settings.monthlyBudget) * 100;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Dashboard</h1>
          <p className="text-muted-foreground">Monitor your AI usage and costs</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          {showSettings ? 'Hide Settings' : 'Settings'}
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert 
              key={index} 
              className={
                alert.severity === 'error' ? 'border-red-200 bg-red-50' :
                alert.severity === 'warning' ? 'border-orange-200 bg-orange-50' :
                'border-blue-200 bg-blue-50'
              }
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Stats</TabsTrigger>
          <TabsTrigger value="settings">Cost Controls</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Current Usage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.costToday)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(settings.dailyBudget)} daily budget
                </div>
                <Progress value={Math.min(dailyBudgetUsed, 100)} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {dailyBudgetUsed.toFixed(1)}% used
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Month's Cost</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.costThisMonth)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(settings.monthlyBudget)} monthly budget
                </div>
                <Progress value={Math.min(monthlyBudgetUsed, 100)} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {monthlyBudgetUsed.toFixed(1)}% used
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Requests</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.requestsToday)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatNumber(stats.tokensToday)} tokens used
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {stats.averageTokensPerRequest.toFixed(0)} tokens/request
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Model Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Model Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topModelsUsed.map((model, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{model.model}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatNumber(model.requests)} requests
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(model.cost)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatNumber(model.tokens)} tokens
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Stats Tab */}
        <TabsContent value="detailed" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* All-time Stats */}
            <Card>
              <CardHeader>
                <CardTitle>All-time Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Requests:</span>
                  <span className="font-medium">{formatNumber(stats.totalRequests)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tokens:</span>
                  <span className="font-medium">{formatNumber(stats.totalTokens)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <span className="font-medium">{formatCurrency(stats.estimatedCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg. Tokens/Request:</span>
                  <span className="font-medium">{stats.averageTokensPerRequest.toFixed(0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Daily Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Daily Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.dailyUsage.slice(0, 10).map((day, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{new Date(day.date).toLocaleDateString()}</span>
                      <div className="text-right">
                        <div>{formatCurrency(day.cost)}</div>
                        <div className="text-xs text-muted-foreground">
                          {day.requests} requests
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Controls</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set spending limits to control your AI usage costs
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dailyBudget">Daily Budget ($)</Label>
                  <Input
                    id="dailyBudget"
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.dailyBudget}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      dailyBudget: parseFloat(e.target.value) || 0
                    } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyBudget">Monthly Budget ($)</Label>
                  <Input
                    id="monthlyBudget"
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.monthlyBudget}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      monthlyBudget: parseFloat(e.target.value) || 0
                    } : null)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.alertThreshold}
                  onChange={(e) => setSettings(prev => prev ? {
                    ...prev,
                    alertThreshold: parseInt(e.target.value) || 80
                  } : null)}
                />
                <p className="text-xs text-muted-foreground">
                  Get alerts when usage reaches this percentage of your budget
                </p>
              </div>
              <Button 
                onClick={() => updateSettings(settings)} 
                disabled={saving}
                className="w-full"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}