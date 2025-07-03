import { RateLimitModel } from '@/models/chat';

interface TrialLimits {
  maxTokensPerDay: number;
  maxRequestsPerDay: number;
  allowedModels: string[];
  maxFileSize: number; // in bytes
  featuresEnabled: {
    fileUpload: boolean;
    scriptGeneration: boolean;
    codeAnalysis: boolean;
    pdfAnalysis: boolean;
  };
}

const TRIAL_LIMITS: TrialLimits = {
  maxTokensPerDay: 1000,
  maxRequestsPerDay: 50,
  allowedModels: ['gemini-1.5-flash'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  featuresEnabled: {
    fileUpload: false, // Disabled for trial users
    scriptGeneration: true,
    codeAnalysis: true,
    pdfAnalysis: false, // Disabled for trial users
  },
};

export class TrialModeService {
  private static TRIAL_USER_PREFIX = 'trial_';

  // Generate a trial user ID based on IP or browser fingerprint
  static generateTrialUserId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${this.TRIAL_USER_PREFIX}${timestamp}_${random}`;
  }

  // Check if user ID is a trial user
  static isTrialUser(userId: string): boolean {
    return userId.startsWith(this.TRIAL_USER_PREFIX);
  }

  // Get trial limits
  static getTrialLimits(): TrialLimits {
    return TRIAL_LIMITS;
  }

  // Check if trial user can make a request
  static async canTrialUserMakeRequest(
    userId: string
  ): Promise<{
    allowed: boolean;
    remaining: number;
    tokensRemaining: number;
    reason?: string;
  }> {
    if (!this.isTrialUser(userId)) {
      throw new Error('Not a trial user');
    }

    const limits = await RateLimitModel.checkLimit(
      userId,
      24 * 60, // 24 hours window
      TRIAL_LIMITS.maxRequestsPerDay,
      TRIAL_LIMITS.maxTokensPerDay
    );

    if (!limits.allowed) {
      return {
        allowed: false,
        remaining: limits.remaining,
        tokensRemaining: limits.tokensRemaining,
        reason: limits.remaining <= 0 
          ? 'Daily request limit exceeded' 
          : 'Daily token limit exceeded',
      };
    }

    return {
      allowed: true,
      remaining: limits.remaining,
      tokensRemaining: limits.tokensRemaining,
    };
  }

  // Record usage for trial user
  static async recordTrialUsage(
    userId: string,
    tokensUsed: number
  ): Promise<void> {
    if (!this.isTrialUser(userId)) {
      throw new Error('Not a trial user');
    }

    await RateLimitModel.recordUsage(userId, tokensUsed);
  }

  // Check if model is allowed for trial users
  static isModelAllowedForTrial(model: string): boolean {
    return TRIAL_LIMITS.allowedModels.includes(model);
  }

  // Check if feature is enabled for trial users
  static isFeatureEnabledForTrial(feature: keyof TrialLimits['featuresEnabled']): boolean {
    return TRIAL_LIMITS.featuresEnabled[feature];
  }

  // Get trial user statistics
  static async getTrialUserStats(userId: string): Promise<{
    requestsToday: number;
    tokensToday: number;
    requestsRemaining: number;
    tokensRemaining: number;
    resetTime: Date;
  }> {
    if (!this.isTrialUser(userId)) {
      throw new Error('Not a trial user');
    }

    const limits = await RateLimitModel.checkLimit(
      userId,
      24 * 60, // 24 hours
      TRIAL_LIMITS.maxRequestsPerDay,
      TRIAL_LIMITS.maxTokensPerDay
    );

    // Calculate reset time (next midnight)
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setHours(24, 0, 0, 0);

    return {
      requestsToday: TRIAL_LIMITS.maxRequestsPerDay - limits.remaining,
      tokensToday: TRIAL_LIMITS.maxTokensPerDay - limits.tokensRemaining,
      requestsRemaining: limits.remaining,
      tokensRemaining: limits.tokensRemaining,
      resetTime,
    };
  }

  // Validate trial request
  static async validateTrialRequest(
    userId: string,
    model: string,
    estimatedTokens: number = 0
  ): Promise<{
    valid: boolean;
    error?: string;
    limits?: {
      remaining: number;
      tokensRemaining: number;
    };
  }> {
    if (!this.isTrialUser(userId)) {
      return { valid: false, error: 'Not a trial user' };
    }

    // Check model
    if (!this.isModelAllowedForTrial(model)) {
      return { 
        valid: false, 
        error: `Model ${model} is not available in trial mode. Please use ${TRIAL_LIMITS.allowedModels.join(' or ')}.` 
      };
    }

    // Check rate limits
    const canMakeRequest = await this.canTrialUserMakeRequest(userId);
    if (!canMakeRequest.allowed) {
      return {
        valid: false,
        error: canMakeRequest.reason || 'Trial limit exceeded',
        limits: {
          remaining: canMakeRequest.remaining,
          tokensRemaining: canMakeRequest.tokensRemaining,
        },
      };
    }

    // Check if estimated tokens would exceed limit
    if (estimatedTokens > 0 && estimatedTokens > canMakeRequest.tokensRemaining) {
      return {
        valid: false,
        error: `Estimated tokens (${estimatedTokens}) exceed remaining daily limit (${canMakeRequest.tokensRemaining})`,
        limits: {
          remaining: canMakeRequest.remaining,
          tokensRemaining: canMakeRequest.tokensRemaining,
        },
      };
    }

    return {
      valid: true,
      limits: {
        remaining: canMakeRequest.remaining,
        tokensRemaining: canMakeRequest.tokensRemaining,
      },
    };
  }

  // Get trial mode welcome message
  static getTrialWelcomeMessage(): string {
    return `Welcome to Gemini CLI Trial Mode! 🎉

You have access to the following features:
• ${TRIAL_LIMITS.maxRequestsPerDay} requests per day
• ${TRIAL_LIMITS.maxTokensPerDay} tokens per day  
• ${TRIAL_LIMITS.allowedModels.join(', ')} model${TRIAL_LIMITS.allowedModels.length > 1 ? 's' : ''}
• Code assistance and script generation
• Monaco code editor

${!TRIAL_LIMITS.featuresEnabled.fileUpload ? '• File upload is disabled (sign in to enable)' : ''}
${!TRIAL_LIMITS.featuresEnabled.pdfAnalysis ? '• PDF analysis is disabled (sign in to enable)' : ''}

Sign in with Google or GitHub to unlock unlimited usage and all features!`;
  }

  // Check if trial user should be prompted to upgrade
  static shouldPromptUpgrade(stats: {
    requestsToday: number;
    tokensToday: number;
  }): boolean {
    const requestUsage = stats.requestsToday / TRIAL_LIMITS.maxRequestsPerDay;
    const tokenUsage = stats.tokensToday / TRIAL_LIMITS.maxTokensPerDay;
    
    // Prompt when user has used 70% of either limit
    return requestUsage >= 0.7 || tokenUsage >= 0.7;
  }
}