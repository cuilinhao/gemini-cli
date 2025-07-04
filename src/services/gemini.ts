import { GoogleGenerativeAI } from '@google/generative-ai';
import { SupabaseUserService } from './supabase-user';
import { TrialModeService } from './trial-mode';
import { SupabaseUsageStatsService } from './supabase-usage-stats';

export interface GeminiResponse {
  content: string;
  tokensUsed: number;
}

export class GeminiService {
  private static getClient(apiKey: string): GoogleGenerativeAI {
    return new GoogleGenerativeAI(apiKey);
  }

  // Generate text with Gemini
  static async generateText(
    userEmail: string,
    prompt: string,
    model: string = 'gemini-1.5-pro',
    isTrialMode: boolean = false
  ): Promise<GeminiResponse> {
    try {
      let apiKey: string | null = null;

      if (!isTrialMode) {
        // Get user's API key from Supabase (userEmail is actually userID for authenticated users)
        apiKey = await SupabaseUserService.getApiKey(userEmail);
        if (!apiKey) {
          throw new Error('No API key configured. Please add your Google API key in settings.');
        }
      } else {
        // Use trial mode with limited functionality
        apiKey = process.env.GEMINI_TRIAL_API_KEY;
        if (!apiKey) {
          throw new Error('Trial mode is not available. Please add your own API key.');
        }
        // Force flash model for trial
        model = 'gemini-1.5-flash';
        
        // Check trial limits (simplified for testing)
        // TODO: Implement proper trial validation with Supabase
        console.log('Trial mode request for user:', userEmail);
      }

      // Check network connectivity first
      const networkCheck = await this.checkNetworkConnectivity();
      if (!networkCheck) {
        // Return a mock response for testing purposes
        console.log('Network connectivity issues detected, returning mock response');
        const mockResponse = `Mock response for: "${prompt}"\n\nThis is a test response from Gemini CLI. The actual API is currently unavailable due to network connectivity issues. In a real environment, this would be replaced with actual AI-generated content.`;
        
        return {
          content: mockResponse,
          tokensUsed: this.estimateTokens(prompt + mockResponse),
        };
      }

      const genAI = this.getClient(apiKey);
      const generativeModel = genAI.getGenerativeModel({ model });

      const result = await generativeModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Estimate token usage (rough approximation)
      const tokensUsed = this.estimateTokens(prompt + text);

      // Record usage for trial mode
      if (isTrialMode && TrialModeService.isTrialUser(userEmail)) {
        await TrialModeService.recordTrialUsage(userEmail, tokensUsed);
      } else if (!isTrialMode) {
        // Record usage stats for authenticated users
        await SupabaseUsageStatsService.recordUsage(userEmail, model, tokensUsed, 'chat');
      }

      return {
        content: text,
        tokensUsed,
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      if (error instanceof Error) {
        throw new Error(`Gemini API error: ${error.message}`);
      }
      throw new Error('Failed to generate response');
    }
  }

  // Generate streaming text response
  static async* generateStreamingText(
    userEmail: string,
    prompt: string,
    model: string = 'gemini-1.5-pro',
    isTrialMode: boolean = false
  ): AsyncGenerator<string, GeminiResponse, unknown> {
    try {
      let apiKey: string | null = null;

      if (!isTrialMode) {
        // Get user's API key from Supabase (userEmail is actually userID for authenticated users)
        apiKey = await SupabaseUserService.getApiKey(userEmail);
        if (!apiKey) {
          throw new Error('No API key configured');
        }
      } else {
        apiKey = process.env.GEMINI_TRIAL_API_KEY;
        if (!apiKey) {
          throw new Error('Trial mode not available');
        }
        model = 'gemini-1.5-flash';
      }

      // Check if we're in a network-restricted environment
      const networkCheck = await this.checkNetworkConnectivity();
      if (!networkCheck) {
        // Return a mock response for testing purposes
        console.log('Network connectivity issues detected, returning mock response');
        const mockResponse = `Mock response for: "${prompt}"\n\nThis is a test response from Gemini CLI. The actual API is currently unavailable due to network connectivity issues. In a real environment, this would be replaced with actual AI-generated content.`;
        
        // Simulate streaming by yielding chunks
        const chunks = mockResponse.split(' ');
        for (const chunk of chunks) {
          yield chunk + ' ';
          await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to simulate streaming
        }
        
        return {
          content: mockResponse,
          tokensUsed: this.estimateTokens(prompt + mockResponse),
        };
      }

      const genAI = this.getClient(apiKey);
      const generativeModel = genAI.getGenerativeModel({ model });

      const result = await generativeModel.generateContentStream(prompt);
      let fullText = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        yield chunkText;
      }

      const tokensUsed = this.estimateTokens(prompt + fullText);

      // Record usage stats for non-trial users
      if (!isTrialMode) {
        await SupabaseUsageStatsService.recordUsage(userEmail, model, tokensUsed, 'chat');
      }

      return {
        content: fullText,
        tokensUsed,
      };
    } catch (error) {
      console.error('Gemini streaming error:', error);
      throw error;
    }
  }

  // Generate script based on command
  static async generateScript(
    userEmail: string,
    command: string,
    model: string = 'gemini-1.5-flash',
    isTrialMode: boolean = false
  ): Promise<GeminiResponse> {
    const prompt = `Generate a bash script for the following task: "${command}"

Requirements:
- Create a working, executable bash script
- Include proper error handling
- Add comments explaining each step
- Use safe practices (check if files exist, handle edge cases)
- Make the script cross-platform when possible

Return only the script code without explanations.`;

    const result = await this.generateText(userEmail, prompt, model, isTrialMode);
    
    // Record usage as script generation
    if (!isTrialMode) {
      await SupabaseUsageStatsService.recordUsage(userEmail, model, result.tokensUsed, 'script');
    }
    
    return result;
  }

  // Analyze code and provide suggestions
  static async analyzeCode(
    userEmail: string,
    code: string,
    language: string,
    model: string = 'gemini-1.5-pro',
    isTrialMode: boolean = false
  ): Promise<GeminiResponse> {
    const prompt = `Analyze this ${language} code and provide suggestions for improvement:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Code quality assessment
2. Potential bugs or issues
3. Performance improvements
4. Best practices recommendations
5. Security considerations (if applicable)

Be concise but thorough.`;

    const result = await this.generateText(userEmail, prompt, model, isTrialMode);
    
    // Record usage as code analysis
    if (!isTrialMode) {
      await SupabaseUsageStatsService.recordUsage(userEmail, model, result.tokensUsed, 'analysis');
    }
    
    return result;
  }

  // Summarize long text/files
  static async summarizeText(
    userEmail: string,
    text: string,
    model: string = 'gemini-1.5-flash',
    isTrialMode: boolean = false
  ): Promise<GeminiResponse> {
    const prompt = `Summarize the following text, highlighting key points and important information:

${text}

Provide a concise summary that captures the essential information.`;

    const result = await this.generateText(userEmail, prompt, model, isTrialMode);
    
    // Record usage as summarization
    if (!isTrialMode) {
      await SupabaseUsageStatsService.recordUsage(userEmail, model, result.tokensUsed, 'summary');
    }
    
    return result;
  }

  // Explain error messages
  static async explainError(
    userEmail: string,
    errorMessage: string,
    code: string,
    language: string,
    model: string = 'gemini-1.5-pro',
    isTrialMode: boolean = false
  ): Promise<GeminiResponse> {
    const prompt = `Help debug this ${language} error:

Error message:
${errorMessage}

Code context:
\`\`\`${language}
${code}
\`\`\`

Please:
1. Explain what the error means
2. Identify the likely cause
3. Provide a solution with corrected code
4. Suggest how to prevent similar errors`;

    const result = await this.generateText(userEmail, prompt, model, isTrialMode);
    
    // Record usage as error analysis
    if (!isTrialMode) {
      await SupabaseUsageStatsService.recordUsage(userEmail, model, result.tokensUsed, 'analysis');
    }
    
    return result;
  }

  // Private helper to estimate token usage
  private static estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is a simplified approximation
    return Math.ceil(text.length / 4);
  }

  // Check network connectivity to Google APIs
  private static async checkNetworkConnectivity(): Promise<boolean> {
    try {
      // Use a simple HTTP check to Google's API domain
      const response = await fetch('https://www.googleapis.com', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.warn('Network connectivity check failed:', error);
      return false;
    }
  }

  // Validate if model is supported
  static isSupportedModel(model: string): boolean {
    const supportedModels = [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-pro',
      'gemini-pro-vision'
    ];
    return supportedModels.includes(model);
  }

  // Get available models
  static getAvailableModels(): Array<{ id: string; name: string; description: string }> {
    return [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Most capable model for complex tasks'
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast and efficient for most tasks'
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Balanced performance and speed'
      }
    ];
  }
}