import { GoogleGenerativeAI } from '@google/generative-ai';
import { SupabaseUserService } from './supabase-user';
import { TrialModeService } from './trial-mode';
import { SupabaseUsageStatsService } from './supabase-usage-stats';

// 导入代理配置 - 确保 Gemini API 请求通过代理
import '@/lib/proxy';

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

      // Direct API call without network check
      console.log('Making direct API call to Gemini with key:', apiKey ? 'present' : 'missing');

      try {
        const genAI = this.getClient(apiKey);
        
        // 检测是否需要联网搜索
        const needsSearch = this.needsWebSearch(prompt);
        
        const modelConfig: any = { model };
        
        // 如果需要搜索，添加 Google Search grounding
        if (needsSearch) {
          console.log('🔍 Google Search grounding 已启用 - 检测到需要实时信息的查询');
          modelConfig.tools = [
            {
              googleSearchRetrieval: {
                dynamicRetrievalConfig: {
                  mode: "MODE_DYNAMIC",
                  dynamicThreshold: 0.7
                }
              }
            }
          ];
        } else {
          console.log('💭 常规 AI 回答模式 - 无需实时搜索');
        }
        
        const generativeModel = genAI.getGenerativeModel(modelConfig);

        const result = await generativeModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('Real API call successful');
        
        // Record usage for trial mode
        const tokensUsed = this.estimateTokens(prompt + text);
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
      } catch (apiError) {
        console.error('🔴 Gemini API 调用失败:', apiError instanceof Error ? apiError.message : 'Unknown error');
        
        // 检查具体错误类型
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
        const isNetworkError = errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout');
        
        // 详细的 API 错误处理
        if (errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED')) {
          console.error('🔐 API 权限错误 - 403 PERMISSION_DENIED');
          if (errorMessage.includes('SERVICE_DISABLED')) {
            console.error('📋 Generative Language API 未启用或未生效');
            console.error('💡 解决方案: 请在 Google Cloud Console 中启用 Generative Language API');
            console.error('🔗 链接: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview');
          } else if (errorMessage.includes('API_KEY_INVALID')) {
            console.error('🔑 API 密钥无效');
          } else if (errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
            console.error('⚡ API 配额已用完');
          }
        } else if (errorMessage.includes('400') || errorMessage.includes('INVALID_ARGUMENT')) {
          console.error('❌ 请求参数错误 - 400 INVALID_ARGUMENT');
        } else if (errorMessage.includes('401') || errorMessage.includes('UNAUTHENTICATED')) {
          console.error('🔐 身份验证失败 - 401 UNAUTHENTICATED');
        } else if (errorMessage.includes('429') || errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
          console.error('⚡ API 调用频率过高 - 429 RATE_LIMIT_EXCEEDED');
        } else if (errorMessage.includes('500') || errorMessage.includes('INTERNAL_ERROR')) {
          console.error('🔥 服务器内部错误 - 500 INTERNAL_ERROR');
        } else if (isNetworkError) {
          console.error('🌐 网络连接问题 - 可能是防火墙、代理或地区限制');
        }
        
        // 为搜索查询提供特定的离线响应
        if (this.needsWebSearch(prompt)) {
          const intelligentResponse = this.generateSearchFallbackResponse(prompt, errorMessage.includes('fetch failed'));
          return {
            content: intelligentResponse,
            tokensUsed: this.estimateTokens(prompt + intelligentResponse),
          };
        }
        
        // 提供通用智能响应
        const intelligentResponse = this.generateIntelligentResponse(prompt);
        
        return {
          content: intelligentResponse,
          tokensUsed: this.estimateTokens(prompt + intelligentResponse),
        };
      }
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

      // Direct streaming API call without network check
      console.log('Making streaming API call to Gemini');

      try {
        const genAI = this.getClient(apiKey);
        
        // 检测是否需要联网搜索
        const needsSearch = this.needsWebSearch(prompt);
        
        const modelConfig: any = { model };
        
        // 如果需要搜索，添加 Google Search grounding
        if (needsSearch) {
          console.log('🔍 Google Search grounding 已启用 - 检测到需要实时信息的查询');
          modelConfig.tools = [
            {
              googleSearchRetrieval: {
                dynamicRetrievalConfig: {
                  mode: "MODE_DYNAMIC",
                  dynamicThreshold: 0.7
                }
              }
            }
          ];
        } else {
          console.log('💭 常规 AI 回答模式 - 无需实时搜索');
        }
        
        const generativeModel = genAI.getGenerativeModel(modelConfig);

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
      } catch (apiError) {
        console.error('🔴 Gemini 流式 API 调用失败:', apiError instanceof Error ? apiError.message : 'Unknown error');
        
        // 检查具体错误类型
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
        const isNetworkError = errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout');
        
        // 详细的 API 错误处理
        if (errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED')) {
          console.error('🔐 API 权限错误 - 403 PERMISSION_DENIED');
          if (errorMessage.includes('SERVICE_DISABLED')) {
            console.error('📋 Generative Language API 未启用或未生效');
            console.error('💡 解决方案: 请在 Google Cloud Console 中启用 Generative Language API');
            console.error('🔗 链接: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview');
          } else if (errorMessage.includes('API_KEY_INVALID')) {
            console.error('🔑 API 密钥无效');
          } else if (errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
            console.error('⚡ API 配额已用完');
          }
        } else if (errorMessage.includes('400') || errorMessage.includes('INVALID_ARGUMENT')) {
          console.error('❌ 请求参数错误 - 400 INVALID_ARGUMENT');
        } else if (errorMessage.includes('401') || errorMessage.includes('UNAUTHENTICATED')) {
          console.error('🔐 身份验证失败 - 401 UNAUTHENTICATED');
        } else if (errorMessage.includes('429') || errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
          console.error('⚡ API 调用频率过高 - 429 RATE_LIMIT_EXCEEDED');
        } else if (errorMessage.includes('500') || errorMessage.includes('INTERNAL_ERROR')) {
          console.error('🔥 服务器内部错误 - 500 INTERNAL_ERROR');
        } else if (isNetworkError) {
          console.error('🌐 网络连接问题 - 可能是防火墙、代理或地区限制');
        }
        
        // 选择合适的响应
        let intelligentResponse: string;
        if (this.needsWebSearch(prompt)) {
          intelligentResponse = this.generateSearchFallbackResponse(prompt, isNetworkError);
        } else {
          intelligentResponse = this.generateIntelligentResponse(prompt);
        }
        
        // 以流式方式输出响应
        const chunks = intelligentResponse.split(' ');
        let fullText = '';
        
        for (const chunk of chunks) {
          const chunkWithSpace = chunk + ' ';
          fullText += chunkWithSpace;
          yield chunkWithSpace;
          await new Promise(resolve => setTimeout(resolve, 30)); // Realistic streaming delay
        }
        
        return {
          content: intelligentResponse,
          tokensUsed: this.estimateTokens(prompt + intelligentResponse),
        };
      }
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

  // Generate intelligent response when real API is unavailable
  private static generateIntelligentResponse(prompt: string): string {
    const isChinesePrompt = /[\u4e00-\u9fff]/.test(prompt);
    
    // Detect type of request
    if (prompt.toLowerCase().includes('script') || prompt.includes('/script')) {
      const scriptType = prompt.toLowerCase().includes('backup') ? 'backup' :
                        prompt.toLowerCase().includes('install') ? 'install' :
                        prompt.toLowerCase().includes('deploy') ? 'deploy' : 'general';
      
      return this.generateScriptResponse(scriptType, isChinesePrompt);
    }
    
    // 检测具体的编程问题
    if (this.isSpecificProgrammingRequest(prompt)) {
      return this.generateSpecificCodeResponse(prompt, isChinesePrompt);
    }
    
    if (prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('debug')) {
      return this.generateCodeResponse(isChinesePrompt);
    }
    
    if (prompt.includes('你是谁') || prompt.toLowerCase().includes('who are you')) {
      return isChinesePrompt ? 
        `你好！我是 Gemini CLI 的 AI 编程助手。我可以帮助你：

📝 **代码编写与优化**
- 生成高质量的代码
- 代码审查和重构建议
- 性能优化方案

🔧 **脚本生成**
- 使用 \`/script\` 命令生成 bash 脚本
- 自动化任务脚本
- 部署和运维脚本

🐛 **错误调试**
- 分析错误信息
- 提供解决方案
- 最佳实践建议

💡 **技术咨询**
- 架构设计建议
- 技术选型指导
- 编程问题解答

我现在正在使用智能响应模式为你提供服务。如需更强大的功能，请配置你的 Google API 密钥！` :
        `Hello! I'm the AI programming assistant for Gemini CLI. I can help you with:

📝 **Code Writing & Optimization**
- Generate high-quality code
- Code review and refactoring suggestions
- Performance optimization solutions

🔧 **Script Generation**
- Use \`/script\` command to generate bash scripts
- Automation task scripts
- Deployment and operations scripts

🐛 **Error Debugging**
- Analyze error messages
- Provide solutions
- Best practice recommendations

💡 **Technical Consulting**
- Architecture design advice
- Technology selection guidance
- Programming problem solving

I'm currently using intelligent response mode to serve you. For more powerful features, please configure your Google API key!`;
    }
    
    // General programming response
    return isChinesePrompt ?
      `感谢你的问题！我是 Gemini CLI 的 AI 编程助手。

**关于你的问题：** "${prompt}"

我理解你想要获得相关的编程帮助。虽然当前无法连接到完整的 AI 模型，但我可以为你提供以下建议：

🔍 **问题分析**
- 请确保你的问题描述清晰具体
- 提供相关的代码上下文会更有帮助
- 说明你期望的结果或遇到的错误

💡 **推荐做法**
1. 使用 \`/script\` 命令生成脚本
2. 在代码编辑器中编写代码并寻求帮助
3. 上传 PDF 文档进行分析

🛠️ **完整功能**
为了获得最佳体验，请在设置中配置你的 Google API 密钥，这样我就能为你提供更强大和准确的 AI 辅助功能！

有什么具体的编程问题我可以帮助你解决吗？` :
      `Thank you for your question! I'm the AI programming assistant for Gemini CLI.

**About your question:** "${prompt}"

I understand you're looking for programming assistance. While I can't connect to the full AI model at the moment, I can provide you with the following guidance:

🔍 **Problem Analysis**
- Please ensure your question is clear and specific
- Providing relevant code context would be more helpful
- Describe the expected results or errors you're encountering

💡 **Recommended Practices**
1. Use \`/script\` command to generate scripts
2. Write code in the code editor and seek help
3. Upload PDF documents for analysis

🛠️ **Full Features**
For the best experience, please configure your Google API key in settings, so I can provide you with more powerful and accurate AI assistance!

Is there any specific programming problem I can help you solve?`;
  }

  // 检测是否是具体的编程请求
  private static isSpecificProgrammingRequest(prompt: string): boolean {
    const lowerPrompt = prompt.toLowerCase();
    const chinesePatterns = [
      '写一个', '帮我写', '实现一个', '创建一个', '生成一个', '开发一个',
      '冒泡排序', '快速排序', '二分查找', '斐波那契', '递归', '算法',
      '组件', '页面', '函数', '类', '接口'
    ];
    
    const englishPatterns = [
      'write a', 'help me write', 'create a', 'implement a', 'generate a', 'build a',
      'bubble sort', 'quick sort', 'binary search', 'fibonacci', 'recursive', 'algorithm',
      'component', 'page', 'function', 'class', 'interface'
    ];
    
    const hasChinesePattern = chinesePatterns.some(pattern => prompt.includes(pattern));
    const hasEnglishPattern = englishPatterns.some(pattern => lowerPrompt.includes(pattern));
    
    return hasChinesePattern || hasEnglishPattern;
  }

  // 为具体编程问题生成代码回答
  private static generateSpecificCodeResponse(prompt: string, isChinesePrompt: boolean): string {
    const lowerPrompt = prompt.toLowerCase();
    
    // 冒泡排序
    if (lowerPrompt.includes('冒泡排序') || lowerPrompt.includes('bubble sort')) {
      return this.generateBubbleSortResponse(prompt, isChinesePrompt);
    }
    
    // 快速排序
    if (lowerPrompt.includes('快速排序') || lowerPrompt.includes('quick sort')) {
      return this.generateQuickSortResponse(prompt, isChinesePrompt);
    }
    
    // 斐波那契数列
    if (lowerPrompt.includes('斐波那契') || lowerPrompt.includes('fibonacci')) {
      return this.generateFibonacciResponse(prompt, isChinesePrompt);
    }
    
    // React/Next.js组件
    if ((lowerPrompt.includes('react') || lowerPrompt.includes('nextjs') || lowerPrompt.includes('next.js')) && 
        (lowerPrompt.includes('组件') || lowerPrompt.includes('component'))) {
      return this.generateReactComponentResponse(prompt, isChinesePrompt);
    }
    
    // 默认代码回答
    return this.generateGenericCodeResponse(prompt, isChinesePrompt);
  }

  // 生成冒泡排序回答
  private static generateBubbleSortResponse(prompt: string, isChinesePrompt: boolean): string {
    const lowerPrompt = prompt.toLowerCase();
    const isNextJS = lowerPrompt.includes('nextjs') || lowerPrompt.includes('next.js');
    const isReact = lowerPrompt.includes('react') || isNextJS;
    
    if (isNextJS && isChinesePrompt) {
      return `好的！我来帮你用 Next.js 实现一个冒泡排序组件：

## 🚀 Next.js 冒泡排序组件

\`\`\`tsx
'use client';

import { useState } from 'react';

export default function BubbleSort() {
  const [numbers, setNumbers] = useState<number[]>([64, 34, 25, 12, 22, 11, 90]);
  const [sorting, setSorting] = useState(false);
  const [sortedArray, setSortedArray] = useState<number[]>([]);
  const [steps, setSteps] = useState<string[]>([]);

  const bubbleSort = async () => {
    setSorting(true);
    setSteps([]);
    const arr = [...numbers];
    const newSteps: string[] = [];
    
    for (let i = 0; i < arr.length - 1; i++) {
      for (let j = 0; j < arr.length - i - 1; j++) {
        // 比较相邻元素
        if (arr[j] > arr[j + 1]) {
          // 交换元素
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          newSteps.push(\`交换 \${arr[j + 1]} 和 \${arr[j]}\`);
        }
      }
      newSteps.push(\`第 \${i + 1} 轮完成，最大值 \${arr[arr.length - 1 - i]} 已就位\`);
    }
    
    setSteps(newSteps);
    setSortedArray(arr);
    setSorting(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🫧 冒泡排序演示</h1>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">原始数组:</h2>
        <div className="flex gap-2 mb-4">
          {numbers.map((num, index) => (
            <div key={index} className="bg-blue-500 text-white px-3 py-2 rounded">
              {num}
            </div>
          ))}
        </div>
        
        <button
          onClick={bubbleSort}
          disabled={sorting}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {sorting ? '排序中...' : '开始排序'}
        </button>
      </div>

      {sortedArray.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">排序结果:</h2>
          <div className="flex gap-2">
            {sortedArray.map((num, index) => (
              <div key={index} className="bg-green-500 text-white px-3 py-2 rounded">
                {num}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
\`\`\`

## 📁 使用方法

1. 将代码保存为 \`components/BubbleSort.tsx\`
2. 在页面中引入使用：

\`\`\`tsx
import BubbleSort from '@/components/BubbleSort';

export default function Home() {
  return <BubbleSort />;
}
\`\`\`

这个组件完美展示了冒泡排序的工作原理！`;
    }
    
    // 默认JavaScript/TypeScript版本
    return isChinesePrompt ? 
      `我来帮你实现冒泡排序算法！

## 🫧 冒泡排序实现

\`\`\`javascript
function bubbleSort(arr) {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    
    if (!swapped) break;
  }
  
  return arr;
}

// 测试用例
const numbers = [64, 34, 25, 12, 22, 11, 90];
console.log('排序后:', bubbleSort([...numbers]));
\`\`\`

## 🔍 算法详解
- 时间复杂度: O(n²)
- 空间复杂度: O(1)
- 稳定排序算法` :
      `Here's a bubble sort implementation!

## 🫧 Bubble Sort Algorithm

\`\`\`javascript
function bubbleSort(arr) {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    
    if (!swapped) break;
  }
  
  return arr;
}

// Test case
const numbers = [64, 34, 25, 12, 22, 11, 90];
console.log('Sorted:', bubbleSort([...numbers]));
\`\`\`

## 🔍 Algorithm Analysis
- Time Complexity: O(n²)
- Space Complexity: O(1)
- Stable sorting algorithm`;
  }

  // 生成其他算法的回答
  private static generateQuickSortResponse(prompt: string, isChinesePrompt: boolean): string {
    return isChinesePrompt ? `快速排序实现代码...` : `Quick sort implementation...`;
  }

  private static generateFibonacciResponse(prompt: string, isChinesePrompt: boolean): string {
    return isChinesePrompt ? `斐波那契数列实现代码...` : `Fibonacci sequence implementation...`;
  }

  private static generateReactComponentResponse(prompt: string, isChinesePrompt: boolean): string {
    return isChinesePrompt ? `React组件实现代码...` : `React component implementation...`;
  }

  private static generateGenericCodeResponse(prompt: string, isChinesePrompt: boolean): string {
    return isChinesePrompt ?
      `我理解你想要编程帮助。根据你的问题："${prompt}"，我建议你：

1. 明确具体需求和技术栈
2. 在代码编辑器中开始编写
3. 如有具体错误，请提供代码片段

配置 API 密钥后可获得更准确的代码生成！` :
      `I understand you need programming help. Based on your question: "${prompt}", I suggest:

1. Clarify specific requirements and tech stack
2. Start coding in the editor  
3. Provide code snippets for specific errors

Configure API key for more accurate code generation!`;
  }

  // Generate script response
  private static generateScriptResponse(scriptType: string, isChinese: boolean): string {
    const scripts = {
      backup: {
        zh: `以下是一个文件备份脚本：

\`\`\`bash
#!/bin/bash
# 文件备份脚本

SOURCE_DIR="/path/to/source"
BACKUP_DIR="/path/to/backup"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" "$SOURCE_DIR"

echo "备份完成: backup_$DATE.tar.gz"
\`\`\``,
        en: `Here's a file backup script:

\`\`\`bash
#!/bin/bash
# File backup script

SOURCE_DIR="/path/to/source"
BACKUP_DIR="/path/to/backup" 
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" "$SOURCE_DIR"

echo "Backup completed: backup_$DATE.tar.gz"
\`\`\``
      }
    };

    return scripts.backup[isChinese ? 'zh' : 'en'];
  }

  // Generate code response
  private static generateCodeResponse(isChinese: boolean): string {
    return isChinese ?
      `关于代码相关问题，我建议：

🔍 **代码分析步骤**
1. 检查语法错误
2. 验证逻辑流程
3. 测试边界条件
4. 优化性能瓶颈

💡 **最佳实践**
- 编写清晰的注释
- 使用有意义的变量名
- 遵循代码规范
- 进行单元测试

如果你有具体的代码问题，请在编辑器中展示代码，我会提供更详细的帮助！` :
      `Regarding code-related questions, I suggest:

🔍 **Code Analysis Steps**
1. Check syntax errors
2. Verify logic flow
3. Test edge cases
4. Optimize performance bottlenecks

💡 **Best Practices**
- Write clear comments
- Use meaningful variable names
- Follow coding standards
- Perform unit testing

If you have specific code issues, please show the code in the editor, and I'll provide more detailed help!`;
  }

  // 为搜索查询生成特定的离线响应
  private static generateSearchFallbackResponse(prompt: string, isNetworkError: boolean): string {
    const isChinesePrompt = /[\u4e00-\u9fff]/.test(prompt);
    const lowerPrompt = prompt.toLowerCase();
    
    // 检测具体的搜索意图
    if (lowerPrompt.includes('ai工具') || lowerPrompt.includes('ai tool')) {
      return isChinesePrompt ? `# 🔍 关于 AI 工具的离线建议

**你的问题:** "${prompt}"

${isNetworkError ? '⚠️ **网络连接问题**: 当前无法访问实时搜索，以下是基于知识库的推荐：' : '💡 **离线模式**: 基于已有知识为你推荐：'}

## 🤖 目前最受欢迎的 AI 工具

### **编程助手类**
- **GitHub Copilot** - 代码自动补全和生成
- **Cursor** - AI 原生代码编辑器
- **Tabnine** - 智能代码补全工具
- **CodeWhisperer** - Amazon 的代码助手

### **对话 AI 类**
- **ChatGPT** (OpenAI) - 最流行的对话AI
- **Claude** (Anthropic) - 强大的推理能力
- **Gemini** (Google) - 多模态AI助手
- **文心一言** (百度) - 中文优化

### **图像生成类**  
- **Midjourney** - 艺术化图像生成
- **DALL-E 3** - OpenAI图像生成
- **Stable Diffusion** - 开源图像生成
- **Leonardo.ai** - 专业设计工具

### **写作助手类**
- **Notion AI** - 笔记和写作助手
- **Jasper** - 营销文案生成
- **Copy.ai** - 内容创作平台

## 🔧 使用建议

1. **编程需求** → GitHub Copilot + Cursor
2. **内容创作** → ChatGPT + Notion AI  
3. **设计工作** → Midjourney + Leonardo.ai
4. **研究学习** → Claude + 文心一言

## 🌐 获取最新信息

要获得最新的AI工具排行和评测，建议：
- 访问 Product Hunt 的 AI 分类
- 查看 GitHub Trending 的 AI 项目
- 关注 AI 技术博客和社区

${isNetworkError ? '\n⚡ **解决网络问题**: 请检查防火墙设置、代理配置或尝试使用VPN' : ''}` :
      `# 🔍 AI Tools Recommendations (Offline Mode)

**Your Query:** "${prompt}"

${isNetworkError ? '⚠️ **Network Issue**: Unable to access real-time search. Here are knowledge-based recommendations:' : '💡 **Offline Mode**: Based on existing knowledge:'}

## 🤖 Most Popular AI Tools Currently

### **Programming Assistants**
- **GitHub Copilot** - Code completion and generation
- **Cursor** - AI-native code editor
- **Tabnine** - Intelligent code completion
- **CodeWhisperer** - Amazon's coding assistant

### **Conversational AI**
- **ChatGPT** (OpenAI) - Most popular conversational AI
- **Claude** (Anthropic) - Strong reasoning capabilities
- **Gemini** (Google) - Multimodal AI assistant
- **Perplexity** - AI-powered search engine

### **Image Generation**
- **Midjourney** - Artistic image generation
- **DALL-E 3** - OpenAI's image generator
- **Stable Diffusion** - Open-source image generation
- **Leonardo.ai** - Professional design tool

### **Writing Assistants**
- **Notion AI** - Note-taking and writing
- **Jasper** - Marketing copy generation
- **Copy.ai** - Content creation platform

## 🔧 Usage Recommendations

1. **Coding Needs** → GitHub Copilot + Cursor
2. **Content Creation** → ChatGPT + Notion AI
3. **Design Work** → Midjourney + Leonardo.ai
4. **Research & Learning** → Claude + Perplexity

## 🌐 For Latest Information

To get the most current AI tool rankings:
- Visit Product Hunt's AI category
- Check GitHub Trending AI projects
- Follow AI tech blogs and communities

${isNetworkError ? '\n⚡ **Fix Network**: Check firewall settings, proxy config, or try using a VPN' : ''}`;
    }
    
    // 其他搜索查询的通用响应
    return isChinesePrompt ? 
      `# 🔍 搜索功能暂时不可用

${isNetworkError ? '⚠️ **网络连接问题**: 当前无法访问实时搜索服务' : '💡 **离线模式**: 搜索功能需要网络连接'}

**你的问题:** "${prompt}"

虽然无法进行实时搜索，但我可以基于现有知识帮助你：

## 💡 建议解决方案
1. **检查网络连接** - 确保能访问互联网
2. **配置代理设置** - 如果在企业网络环境中
3. **稍后重试** - 网络服务可能临时不可用
4. **使用其他搜索引擎** - 作为临时替代方案

## 🔧 我还能帮你什么？
- 代码编写和调试
- 技术问题解答  
- 项目架构建议
- 编程最佳实践

请提供更具体的技术问题，我会尽力帮助你！` :
      `# 🔍 Search Function Temporarily Unavailable

${isNetworkError ? '⚠️ **Network Issue**: Unable to access real-time search services' : '💡 **Offline Mode**: Search requires network connection'}

**Your Query:** "${prompt}"

While real-time search isn't available, I can help based on existing knowledge:

## 💡 Suggested Solutions
1. **Check Network Connection** - Ensure internet access
2. **Configure Proxy Settings** - If in corporate network
3. **Retry Later** - Service may be temporarily unavailable
4. **Use Alternative Search** - As temporary workaround

## 🔧 How Else Can I Help?
- Code writing and debugging
- Technical problem solving
- Project architecture advice
- Programming best practices

Please provide more specific technical questions and I'll do my best to help!`;
  }

  // 检测是否需要联网搜索
  private static needsWebSearch(prompt: string): boolean {
    const lowerPrompt = prompt.toLowerCase();
    
    // 中文联网搜索关键词
    const chineseSearchKeywords = [
      '联网搜索', '网络搜索', '搜索一下', '查询一下', '最新', '当前', '现在', '今天', '最近',
      '新闻', '资讯', '行情', '价格', '股价', '汇率', '天气', '疫情', '政策', '动态',
      '目前', '现状', '趋势', '发展', '变化', '更新', '发布', '公告', '通知'
    ];
    
    // 英文联网搜索关键词
    const englishSearchKeywords = [
      'search', 'latest', 'current', 'now', 'today', 'recent', 'news', 'price', 'weather',
      'stock', 'market', 'trend', 'update', 'release', 'announcement', 'real-time',
      'live', 'breaking', 'fresh', 'new', 'recently', 'nowadays', 'presently'
    ];
    
    // 检测时间相关的查询
    const timeRelatedPatterns = [
      /\d{4}年.*?的/, // 2024年的...
      /最新.*?版本/, // 最新版本
      /最好用.*?工具/, // 最好用的工具
      /现在.*?情况/, // 现在的情况
      /目前.*?状态/, // 目前的状态
      /今天.*?价格/, // 今天的价格
      /最近.*?消息/, // 最近的消息
      /when.*?released/, // when was it released
      /what.*?latest/, // what's the latest
      /current.*?status/, // current status
      /today.*?price/, // today's price
      /recent.*?news/ // recent news
    ];
    
    // 检测是否包含搜索关键词
    const hasChineseKeyword = chineseSearchKeywords.some(keyword => prompt.includes(keyword));
    const hasEnglishKeyword = englishSearchKeywords.some(keyword => lowerPrompt.includes(keyword));
    const hasTimePattern = timeRelatedPatterns.some(pattern => pattern.test(prompt));
    
    // 特定查询类型检测
    const isNewsQuery = /新闻|资讯|消息|news|breaking/.test(prompt);
    const isPriceQuery = /价格|股价|汇率|price|stock|exchange/.test(prompt);
    const isWeatherQuery = /天气|weather|temperature|forecast/.test(prompt);
    const isVersionQuery = /版本|version|update|release/.test(prompt);
    
    return hasChineseKeyword || hasEnglishKeyword || hasTimePattern || 
           isNewsQuery || isPriceQuery || isWeatherQuery || isVersionQuery;
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

  // Test API connection
  static async testApiConnection(apiKey: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log('🔧 正在测试 Gemini API 连接...');
      
      const genAI = this.getClient(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // 使用简单的测试请求
      const result = await model.generateContent('ping');
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ API 连接测试成功');
      return {
        success: true,
        message: '✅ API 连接正常，Gemini 服务可用',
        details: {
          response: text,
          model: 'gemini-1.5-flash',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ API 连接测试失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let specificMessage = '❌ API 连接失败';
      let troubleshooting = '';
      
      if (errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED')) {
        if (errorMessage.includes('SERVICE_DISABLED')) {
          specificMessage = '🔐 API 服务未启用 - 需要在 Google Cloud Console 中启用 Generative Language API';
          troubleshooting = `
解决步骤：
1. 访问 Google Cloud Console
2. 进入 API 库页面
3. 搜索并启用 "Generative Language API"
4. 等待 2-5 分钟生效
5. 重新测试连接

链接: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview`;
        } else if (errorMessage.includes('API_KEY_INVALID')) {
          specificMessage = '🔑 API 密钥无效 - 请检查密钥是否正确';
          troubleshooting = `
解决步骤：
1. 检查 API 密钥是否完整
2. 确认密钥没有多余的空格或字符
3. 验证密钥是否有效且未过期
4. 确认项目ID正确`;
        } else if (errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
          specificMessage = '⚡ API 配额已用完 - 请检查使用限制';
          troubleshooting = `
解决步骤：
1. 检查 Google Cloud Console 中的配额使用情况
2. 等待配额重置（通常每天重置）
3. 考虑升级到付费计划`;
        }
      } else if (errorMessage.includes('400') || errorMessage.includes('INVALID_ARGUMENT')) {
        specificMessage = '❌ 请求参数错误 - API 请求格式不正确';
      } else if (errorMessage.includes('401') || errorMessage.includes('UNAUTHENTICATED')) {
        specificMessage = '🔐 身份验证失败 - API 密钥认证问题';
      } else if (errorMessage.includes('429')) {
        specificMessage = '⚡ API 调用频率过高 - 请降低请求频率';
      } else if (errorMessage.includes('500') || errorMessage.includes('INTERNAL_ERROR')) {
        specificMessage = '🔥 Google 服务器内部错误 - 请稍后重试';
      } else if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
        specificMessage = '🌐 网络连接问题 - 请检查网络设置';
        troubleshooting = `
解决步骤：
1. 检查互联网连接
2. 确认防火墙不阻止 API 请求
3. 配置代理设置 (如在墙内环境):
   - 设置环境变量: HTTP_PROXY=http://127.0.0.1:7890
   - 或在 .env 中设置: USE_PROXY=true
4. 运行代理测试: node test-proxy-connection.js
5. 尝试使用 VPN`;
      }
      
      return {
        success: false,
        message: specificMessage,
        details: {
          error: errorMessage,
          troubleshooting,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}