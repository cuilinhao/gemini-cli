import { supabase, createServiceSupabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface UsageStats {
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

export interface CostSettings {
  monthlyBudget: number;
  dailyBudget: number;
  alertThreshold: number;
  costPerToken: {
    'gemini-1.5-pro': number;
    'gemini-1.5-flash': number;
    'gemini-pro': number;
  };
}

export class SupabaseUsageStatsService {
  private static DEFAULT_COST_SETTINGS: CostSettings = {
    monthlyBudget: 100,
    dailyBudget: 10,
    alertThreshold: 80,
    costPerToken: {
      'gemini-1.5-pro': 0.000125,
      'gemini-1.5-flash': 0.000075,
      'gemini-pro': 0.0001,
    },
  };

  // 计算成本
  static calculateCost(model: string, tokens: number): number {
    const settings = this.DEFAULT_COST_SETTINGS;
    const costPerToken = settings.costPerToken[model as keyof typeof settings.costPerToken] || 0.0001;
    return (tokens / 1000) * costPerToken;
  }

  // 记录使用情况
  static async recordUsage(
    userEmail: string,
    model: string,
    tokensUsed: number,
    requestType: string = 'chat',
    promptTokens: number = 0,
    completionTokens: number = 0
  ): Promise<void> {
    try {
      const estimatedCostCents = Math.round(this.calculateCost(model, tokensUsed) * 100);
      
      const { error } = await supabase
        .from('usage_stats')
        .insert({
          user_id: userEmail,
          model,
          tokens_used: tokensUsed,
          estimated_cost: estimatedCostCents,
          request_type: requestType,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
        });

      if (error) {
        console.error('Error recording usage:', error);
      }
    } catch (error) {
      console.error('Error recording usage:', error);
    }
  }

  // 获取用户使用统计
  static async getUserStats(userEmail: string): Promise<UsageStats> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const serviceSupabase = createServiceSupabase();

      // 获取所有时间的统计，按模型分组
      const { data: allTimeData } = await serviceSupabase
        .from('usage_stats')
        .select('model, tokens_used, estimated_cost')
        .eq('user_id', userEmail);

      // 获取今日统计
      const { data: todayData } = await serviceSupabase
        .from('usage_stats')
        .select('tokens_used, estimated_cost')
        .eq('user_id', userEmail)
        .gte('created_at', todayStart.toISOString());

      // 获取本月统计
      const { data: monthData } = await serviceSupabase
        .from('usage_stats')
        .select('tokens_used, estimated_cost')
        .eq('user_id', userEmail)
        .gte('created_at', monthStart.toISOString());

      // 获取每日使用情况（最近30天）
      const { data: dailyData } = await serviceSupabase
        .from('usage_stats')
        .select('created_at, tokens_used, estimated_cost')
        .eq('user_id', userEmail)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      // 处理模型使用统计
      const modelStats = new Map<string, { requests: number; tokens: number; cost: number }>();
      let totalRequests = 0;
      let totalTokens = 0;
      let estimatedCost = 0;

      allTimeData?.forEach(row => {
        const model = row.model;
        const tokens = row.tokens_used || 0;
        const cost = (row.estimated_cost || 0) / 100;

        totalRequests++;
        totalTokens += tokens;
        estimatedCost += cost;

        if (modelStats.has(model)) {
          const existing = modelStats.get(model)!;
          existing.requests++;
          existing.tokens += tokens;
          existing.cost += cost;
        } else {
          modelStats.set(model, { requests: 1, tokens, cost });
        }
      });

      const topModelsUsed = Array.from(modelStats.entries()).map(([model, stats]) => ({
        model,
        ...stats,
      })).sort((a, b) => b.cost - a.cost);

      // 今日统计
      const requestsToday = todayData?.length || 0;
      const tokensToday = todayData?.reduce((sum, row) => sum + (row.tokens_used || 0), 0) || 0;
      const costToday = todayData?.reduce((sum, row) => sum + (row.estimated_cost || 0), 0) / 100 || 0;

      // 本月统计
      const requestsThisMonth = monthData?.length || 0;
      const tokensThisMonth = monthData?.reduce((sum, row) => sum + (row.tokens_used || 0), 0) || 0;
      const costThisMonth = monthData?.reduce((sum, row) => sum + (row.estimated_cost || 0), 0) / 100 || 0;

      // 每日使用情况
      const dailyUsageMap = new Map<string, { requests: number; tokens: number; cost: number }>();
      dailyData?.forEach(row => {
        const date = new Date(row.created_at!).toISOString().split('T')[0];
        const tokens = row.tokens_used || 0;
        const cost = (row.estimated_cost || 0) / 100;

        if (dailyUsageMap.has(date)) {
          const existing = dailyUsageMap.get(date)!;
          existing.requests++;
          existing.tokens += tokens;
          existing.cost += cost;
        } else {
          dailyUsageMap.set(date, { requests: 1, tokens, cost });
        }
      });

      const dailyUsage = Array.from(dailyUsageMap.entries()).map(([date, stats]) => ({
        date,
        ...stats,
      }));

      return {
        totalRequests,
        totalTokens,
        estimatedCost,
        requestsToday,
        tokensToday,
        costToday,
        requestsThisMonth,
        tokensThisMonth,
        costThisMonth,
        averageTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
        topModelsUsed,
        dailyUsage,
      };
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      throw new Error('Failed to fetch usage statistics');
    }
  }

  // 获取用户成本设置
  static async getUserCostSettings(userEmail: string): Promise<CostSettings> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('cost_settings')
        .eq('email', userEmail)
        .single();

      if (profile?.cost_settings) {
        return { ...this.DEFAULT_COST_SETTINGS, ...profile.cost_settings };
      }

      return this.DEFAULT_COST_SETTINGS;
    } catch (error) {
      console.error('Error fetching cost settings:', error);
      return this.DEFAULT_COST_SETTINGS;
    }
  }

  // 更新用户成本设置
  static async updateUserCostSettings(userEmail: string, settings: Partial<CostSettings>): Promise<void> {
    try {
      const currentSettings = await this.getUserCostSettings(userEmail);
      const newSettings = { ...currentSettings, ...settings };

      const { error } = await supabase
        .from('profiles')
        .update({ cost_settings: newSettings })
        .eq('email', userEmail);

      if (error) {
        console.error('Error updating cost settings:', error);
        throw new Error('Failed to update cost settings');
      }
    } catch (error) {
      console.error('Error updating cost settings:', error);
      throw new Error('Failed to update cost settings');
    }
  }

  // 检查预算限制
  static async checkBudgetLimits(userEmail: string): Promise<{
    dailyLimitExceeded: boolean;
    monthlyLimitExceeded: boolean;
    alertThresholdReached: boolean;
    currentDailyCost: number;
    currentMonthlyCost: number;
    settings: CostSettings;
  }> {
    try {
      const [stats, settings] = await Promise.all([
        this.getUserStats(userEmail),
        this.getUserCostSettings(userEmail),
      ]);

      const dailyLimitExceeded = stats.costToday >= settings.dailyBudget;
      const monthlyLimitExceeded = stats.costThisMonth >= settings.monthlyBudget;
      const alertThresholdReached = 
        (stats.costToday / settings.dailyBudget) * 100 >= settings.alertThreshold ||
        (stats.costThisMonth / settings.monthlyBudget) * 100 >= settings.alertThreshold;

      return {
        dailyLimitExceeded,
        monthlyLimitExceeded,
        alertThresholdReached,
        currentDailyCost: stats.costToday,
        currentMonthlyCost: stats.costThisMonth,
        settings,
      };
    } catch (error) {
      console.error('Error checking budget limits:', error);
      throw new Error('Failed to check budget limits');
    }
  }

  // 获取用户告警
  static async getUserAlerts(userEmail: string): Promise<Array<{
    type: 'daily_limit' | 'monthly_limit' | 'threshold_warning';
    message: string;
    severity: 'info' | 'warning' | 'error';
    percentage: number;
  }>> {
    try {
      const budgetCheck = await this.checkBudgetLimits(userEmail);
      const alerts = [];

      if (budgetCheck.dailyLimitExceeded) {
        alerts.push({
          type: 'daily_limit' as const,
          message: `Daily budget limit exceeded ($${budgetCheck.currentDailyCost.toFixed(2)} / $${budgetCheck.settings.dailyBudget})`,
          severity: 'error' as const,
          percentage: (budgetCheck.currentDailyCost / budgetCheck.settings.dailyBudget) * 100,
        });
      }

      if (budgetCheck.monthlyLimitExceeded) {
        alerts.push({
          type: 'monthly_limit' as const,
          message: `Monthly budget limit exceeded ($${budgetCheck.currentMonthlyCost.toFixed(2)} / $${budgetCheck.settings.monthlyBudget})`,
          severity: 'error' as const,
          percentage: (budgetCheck.currentMonthlyCost / budgetCheck.settings.monthlyBudget) * 100,
        });
      }

      if (budgetCheck.alertThresholdReached && !budgetCheck.dailyLimitExceeded && !budgetCheck.monthlyLimitExceeded) {
        const dailyPercentage = (budgetCheck.currentDailyCost / budgetCheck.settings.dailyBudget) * 100;
        const monthlyPercentage = (budgetCheck.currentMonthlyCost / budgetCheck.settings.monthlyBudget) * 100;
        
        if (dailyPercentage >= budgetCheck.settings.alertThreshold) {
          alerts.push({
            type: 'threshold_warning' as const,
            message: `Daily budget alert: ${dailyPercentage.toFixed(1)}% used ($${budgetCheck.currentDailyCost.toFixed(2)} / $${budgetCheck.settings.dailyBudget})`,
            severity: 'warning' as const,
            percentage: dailyPercentage,
          });
        }
        
        if (monthlyPercentage >= budgetCheck.settings.alertThreshold) {
          alerts.push({
            type: 'threshold_warning' as const,
            message: `Monthly budget alert: ${monthlyPercentage.toFixed(1)}% used ($${budgetCheck.currentMonthlyCost.toFixed(2)} / $${budgetCheck.settings.monthlyBudget})`,
            severity: 'warning' as const,
            percentage: monthlyPercentage,
          });
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error getting user alerts:', error);
      return [];
    }
  }
}