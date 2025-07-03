import { db } from '@/db';
import { usageStats, users } from '@/db/schema';
import { eq, gte, and, desc, sql } from 'drizzle-orm';

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
  alertThreshold: number; // Percentage (0-100)
  costPerToken: {
    'gemini-1.5-pro': number;
    'gemini-1.5-flash': number;
    'gemini-pro': number;
  };
}

export class UsageStatsService {
  private static DEFAULT_COST_SETTINGS: CostSettings = {
    monthlyBudget: 100, // $100 per month
    dailyBudget: 10,    // $10 per day
    alertThreshold: 80, // Alert at 80% usage
    costPerToken: {
      'gemini-1.5-pro': 0.000125,   // $0.125 per 1K tokens
      'gemini-1.5-flash': 0.000075, // $0.075 per 1K tokens
      'gemini-pro': 0.0001,         // $0.1 per 1K tokens
    },
  };

  // Calculate cost based on model and tokens
  static calculateCost(model: string, tokens: number): number {
    const settings = this.DEFAULT_COST_SETTINGS;
    const costPerToken = settings.costPerToken[model as keyof typeof settings.costPerToken] || 0.0001;
    return (tokens / 1000) * costPerToken;
  }

  // Record usage for tracking
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
      
      await db.insert(usageStats).values({
        user_id: userEmail,
        model,
        tokens_used: tokensUsed,
        estimated_cost: estimatedCostCents,
        request_type: requestType,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      });
    } catch (error) {
      console.error('Error recording usage:', error);
    }
  }

  // Get user's usage statistics
  static async getUserStats(userEmail: string): Promise<UsageStats> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Get all-time stats by model
      const allTimeStats = await db
        .select({
          model: usageStats.model,
          totalRequests: sql<number>`count(*)`.as('total_requests'),
          totalTokens: sql<number>`sum(${usageStats.tokens_used})`.as('total_tokens'),
          totalCost: sql<number>`sum(${usageStats.estimated_cost})`.as('total_cost'),
        })
        .from(usageStats)
        .where(eq(usageStats.user_id, userEmail))
        .groupBy(usageStats.model);

      // Get today's stats
      const todayStats = await db
        .select({
          totalRequests: sql<number>`count(*)`.as('total_requests'),
          totalTokens: sql<number>`sum(${usageStats.tokens_used})`.as('total_tokens'),
          totalCost: sql<number>`sum(${usageStats.estimated_cost})`.as('total_cost'),
        })
        .from(usageStats)
        .where(and(
          eq(usageStats.user_id, userEmail),
          gte(usageStats.created_at, todayStart)
        ));

      // Get month's stats
      const monthStats = await db
        .select({
          totalRequests: sql<number>`count(*)`.as('total_requests'),
          totalTokens: sql<number>`sum(${usageStats.tokens_used})`.as('total_tokens'),
          totalCost: sql<number>`sum(${usageStats.estimated_cost})`.as('total_cost'),
        })
        .from(usageStats)
        .where(and(
          eq(usageStats.user_id, userEmail),
          gte(usageStats.created_at, monthStart)
        ));

      // Get daily usage for last 30 days
      const dailyStats = await db
        .select({
          date: sql<string>`DATE(${usageStats.created_at})`.as('date'),
          requests: sql<number>`count(*)`.as('requests'),
          tokens: sql<number>`sum(${usageStats.tokens_used})`.as('tokens'),
          cost: sql<number>`sum(${usageStats.estimated_cost})`.as('cost'),
        })
        .from(usageStats)
        .where(and(
          eq(usageStats.user_id, userEmail),
          gte(usageStats.created_at, thirtyDaysAgo)
        ))
        .groupBy(sql`DATE(${usageStats.created_at})`)
        .orderBy(desc(sql`DATE(${usageStats.created_at})`));

      // Calculate totals
      let totalRequests = 0;
      let totalTokens = 0;
      let estimatedCost = 0;

      const topModelsUsed = allTimeStats.map(stat => {
        const requests = stat.totalRequests || 0;
        const tokens = stat.totalTokens || 0;
        const cost = (stat.totalCost || 0) / 100; // Convert cents to dollars
        
        totalRequests += requests;
        totalTokens += tokens;
        estimatedCost += cost;
        
        return {
          model: stat.model,
          requests,
          tokens,
          cost,
        };
      }).sort((a, b) => b.cost - a.cost);

      // Today's stats
      const todayData = todayStats[0] || { totalRequests: 0, totalTokens: 0, totalCost: 0 };
      const requestsToday = todayData.totalRequests || 0;
      const tokensToday = todayData.totalTokens || 0;
      const costToday = (todayData.totalCost || 0) / 100;

      // Month's stats
      const monthData = monthStats[0] || { totalRequests: 0, totalTokens: 0, totalCost: 0 };
      const requestsThisMonth = monthData.totalRequests || 0;
      const tokensThisMonth = monthData.totalTokens || 0;
      const costThisMonth = (monthData.totalCost || 0) / 100;

      // Daily usage
      const dailyUsage = dailyStats.map(stat => ({
        date: stat.date,
        requests: stat.requests || 0,
        tokens: stat.tokens || 0,
        cost: (stat.cost || 0) / 100,
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

  // Get cost settings for user
  static async getUserCostSettings(userEmail: string): Promise<CostSettings> {
    try {
      const [user] = await db
        .select({ costSettings: users.cost_settings })
        .from(users)
        .where(eq(users.email, userEmail));
      
      if (user?.costSettings) {
        return { ...this.DEFAULT_COST_SETTINGS, ...JSON.parse(user.costSettings) };
      }
      
      return this.DEFAULT_COST_SETTINGS;
    } catch (error) {
      console.error('Error fetching cost settings:', error);
      return this.DEFAULT_COST_SETTINGS;
    }
  }

  // Update cost settings for user
  static async updateUserCostSettings(userEmail: string, settings: Partial<CostSettings>): Promise<void> {
    try {
      const currentSettings = await this.getUserCostSettings(userEmail);
      const newSettings = { ...currentSettings, ...settings };
      
      await db
        .update(users)
        .set({ cost_settings: JSON.stringify(newSettings) })
        .where(eq(users.email, userEmail));
    } catch (error) {
      console.error('Error updating cost settings:', error);
      throw new Error('Failed to update cost settings');
    }
  }

  // Check if user has exceeded budget limits
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

  // Get usage alerts for user
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