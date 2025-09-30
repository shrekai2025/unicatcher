/**
 * DeepSeek 服务实现
 * 支持 DeepSeek API
 */

import { BaseAIService } from '../base/ai-service.interface';
import type {
  AIConfig,
  TweetAnalysisResult,
  ProcessingStats,
  BatchAnalysisResult,
  AIRequestDetails,
  AIResponseDetails,
  TranslationResult
} from '../base/ai-types';

const defaultSystemPrompt = `你是一位专业的中文内容分析师。请仔细分析用户提供的推文内容，并提供以下分析结果：

1. **关键词提取**：从推文中提取3-8个最重要的关键词，优先提取：
   - 技术名词、产品名称、公司名称
   - 核心概念和主要话题
   - 重要的动作词汇
   - 去除停用词和过于通用的词汇

2. **主题标签匹配**：从以下预定义标签中选择最匹配的1-3个：
   {TOPIC_TAGS}

3. **内容类型判断**：从以下类型中选择最符合的1-2个：
   {CONTENT_TYPES}

4. **价值判断**：判断推文是否有信息价值：
   - 有价值：包含技术、产品、教程、新闻、观点等实质内容
   - 无价值：纯聊天、打招呼、日常琐事、情感表达等

请以JSON格式返回结果：
{
  "isValueless": false,
  "keywords": ["关键词1", "关键词2"],
  "topicTags": ["匹配的标签"],
  "contentTypes": ["内容类型"]
}`;

export class DeepSeekService extends BaseAIService {
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(config: AIConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'deepseek-chat';
    this.baseURL = config.baseURL || 'https://api.deepseek.com/v1';
  }

  getProviderName(): string {
    return 'deepseek';
  }

  getSupportedModels(): string[] {
    return ['deepseek-chat', 'deepseek-coder'];
  }

  async validateConfig(): Promise<boolean> {
    try {
      console.log(`[DeepSeek] 验证配置 - 端点: ${this.baseURL}/models`);

      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      console.log(`[DeepSeek] 配置验证响应 - 状态码: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.error('[DeepSeek] 验证配置失败:', error);
      return false;
    }
  }

  async analyzeTweet(
    tweetContent: string,
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>,
    systemPrompt?: string
  ): Promise<TweetAnalysisResult> {
    const prompt = systemPrompt || this.buildSystemPrompt(topicTags, contentTypes);

    try {
      const requestBody = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: `请分析以下推文：\n\n${tweetContent}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      };

      console.log(`[DeepSeek] 调用请求 - 模型: ${this.model}`);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`DeepSeek API 错误: ${response.status} ${error}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('DeepSeek 返回内容为空');
      }

      return this.parseAnalysisResult(content, topicTags, contentTypes);
    } catch (error) {
      console.error('[DeepSeek] 分析推文失败:', error);
      throw error;
    }
  }

  async analyzeTweetsBatchOptimized(
    tweets: Array<{ id: string; content: string }>,
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>,
    systemPrompt?: string,
    onProgress?: (stats: ProcessingStats) => void,
    batchId?: string
  ): Promise<BatchAnalysisResult[]> {
    if (tweets.length === 0) {
      return [];
    }

    console.log(`[DeepSeek] 开始批量分析 ${tweets.length} 条推文`);

    try {
      const batchPrompt = this.getBatchAnalysisPrompt(topicTags, contentTypes, systemPrompt);

      const tweetsContent = tweets.map((tweet, index) =>
        `推文ID: ${tweet.id}\n内容: ${tweet.content}\n---`
      ).join('\n');

      const requestBody = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: batchPrompt,
          },
          {
            role: 'user',
            content: `请分析以下 ${tweets.length} 条推文：\n\n${tweetsContent}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      };

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`DeepSeek API 错误: ${response.status} ${error}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('DeepSeek 返回内容为空');
      }

      return this.parseBatchAnalysisResult(content, tweets, topicTags, contentTypes);
    } catch (error) {
      console.error('[DeepSeek] 批量分析失败:', error);
      return tweets.map(tweet => ({
        tweetId: tweet.id,
        result: null,
        error: error instanceof Error ? error.message : '未知错误'
      }));
    }
  }

  async analyzeTweetsBatch(
    tweets: Array<{ id: string; content: string }>,
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>,
    systemPrompt?: string,
    onProgress?: (stats: ProcessingStats) => void,
    batchId?: string
  ): Promise<BatchAnalysisResult[]> {
    const results: BatchAnalysisResult[] = [];
    const total = tweets.length;
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const tweet of tweets) {
      try {
        const result = await this.analyzeTweet(tweet.content, topicTags, contentTypes, systemPrompt);
        results.push({
          tweetId: tweet.id,
          result
        });
        successful++;
      } catch (error) {
        results.push({
          tweetId: tweet.id,
          result: null,
          error: error instanceof Error ? error.message : '未知错误'
        });
        failed++;
      }

      processed++;

      if (onProgress) {
        onProgress({
          processed,
          total,
          successful,
          failed,
          startTime: Date.now()
        });
      }

      if (processed < total) {
        await this.delay(1000);
      }
    }

    return results;
  }

  private buildSystemPrompt(
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>
  ): string {
    const topicTagsText = topicTags.map(tag =>
      tag.description ? `${tag.name}(${tag.description})` : tag.name
    ).join('、');

    const contentTypesText = contentTypes.map(type =>
      type.description ? `${type.name}(${type.description})` : type.name
    ).join('、');

    return defaultSystemPrompt
      .replace('{TOPIC_TAGS}', topicTagsText)
      .replace('{CONTENT_TYPES}', contentTypesText);
  }

  private getBatchAnalysisPrompt(
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>,
    systemPrompt?: string
  ): string {
    if (systemPrompt) {
      return systemPrompt + '\n\n请对每条推文返回独立的JSON分析结果，整体结果格式为：\n{"results": [{"tweetId": "xxx", "isValueless": false, "keywords": [...], "topicTags": [...], "contentTypes": [...]}]}';
    }

    const basePrompt = this.buildSystemPrompt(topicTags, contentTypes);
    return basePrompt + '\n\n请对每条推文返回独立的JSON分析结果，整体结果格式为：\n{"results": [{"tweetId": "xxx", "isValueless": false, "keywords": [...], "topicTags": [...], "contentTypes": [...]}]}';
  }

  private parseAnalysisResult(
    content: string,
    validTopicTags: Array<{name: string, description?: string}>,
    validContentTypes: Array<{name: string, description?: string}>
  ): TweetAnalysisResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        const keywords = (parsed.keywords || []).filter((k: string) => k && k.trim().length > 0).slice(0, 10);

        const topicTags = (parsed.topicTags || []).filter((tag: string) =>
          validTopicTags.some(validTag => validTag.name.toLowerCase() === tag.toLowerCase())
        );

        const contentTypes = (parsed.contentTypes || []).filter((type: string) =>
          validContentTypes.some(validType => validType.name.toLowerCase() === type.toLowerCase())
        );

        return {
          isValueless: Boolean(parsed.isValueless),
          keywords,
          topicTags,
          contentTypes
        };
      }

      throw new Error('无法解析JSON结果');
    } catch (error) {
      console.error('[DeepSeek] 解析分析结果失败:', error);
      throw new Error('解析AI结果失败');
    }
  }

  private parseBatchAnalysisResult(
    content: string,
    originalTweets: Array<{ id: string; content: string }>,
    validTopicTags: Array<{name: string, description?: string}>,
    validContentTypes: Array<{name: string, description?: string}>
  ): BatchAnalysisResult[] {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const aiResults = parsed.results || [];

        return originalTweets.map(tweet => {
          const aiResult = aiResults.find((r: any) => r.tweetId === tweet.id);

          if (aiResult) {
            const keywords = (aiResult.keywords || []).filter((k: string) => k && k.trim().length > 0).slice(0, 10);

            const topicTags = (aiResult.topicTags || []).filter((tag: string) =>
              validTopicTags.some(validTag => validTag.name.toLowerCase() === tag.toLowerCase())
            );

            const contentTypes = (aiResult.contentTypes || []).filter((type: string) =>
              validContentTypes.some(validType => validType.name.toLowerCase() === type.toLowerCase())
            );

            return {
              tweetId: tweet.id,
              result: {
                isValueless: Boolean(aiResult.isValueless),
                keywords,
                topicTags,
                contentTypes
              }
            };
          } else {
            return {
              tweetId: tweet.id,
              result: null,
              error: '缺少AI分析结果'
            };
          }
        });
      }

      throw new Error('无法解析批量JSON结果');
    } catch (error) {
      console.error('[DeepSeek] 解析批量结果失败:', error);
      return originalTweets.map(tweet => ({
        tweetId: tweet.id,
        result: null,
        error: '解析AI结果失败'
      }));
    }
  }

  async translateTweet(
    content: string,
    targetLanguage: string = 'zh-CN'
  ): Promise<TranslationResult> {
    try {
      const requestBody = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `你是专业的翻译助手。请分析以下文本的语言，如果不是中文，请翻译为简体中文。如果已经是中文，请转换为标准简体中文。

要求：
1. 保持原意和语调
2. 使用简体中文
3. 保持推文的简洁性
4. 技术术语保持准确性

请以JSON格式返回结果：
{
  "originalLanguage": "检测到的原始语言代码(如: en, ja, ko, zh等)",
  "translatedContent": "翻译后的简体中文内容",
  "isTranslated": "是否进行了翻译(boolean)"
}`
          },
          {
            role: 'user',
            content: `请翻译以下文本：${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      };

      console.log(`[DeepSeek翻译] 调用请求 - 模型: ${this.model}`);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`DeepSeek翻译API错误: ${response.status} ${error}`);
      }

      const data = await response.json();
      const responseContent = data.choices?.[0]?.message?.content;

      if (!responseContent) {
        throw new Error('DeepSeek翻译返回内容为空');
      }

      return this.parseTranslationResult(responseContent);
    } catch (error) {
      console.error('[DeepSeek翻译] 翻译失败:', error);
      throw error;
    }
  }

  private parseTranslationResult(content: string): TranslationResult {
    try {
      console.log(`[DeepSeek翻译] 开始解析翻译结果:`, content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[DeepSeek翻译] 解析的JSON:`, parsed);

        const result: TranslationResult = {
          originalLanguage: parsed.originalLanguage || 'unknown',
          translatedContent: parsed.translatedContent || content,
          isTranslated: Boolean(parsed.isTranslated)
        };

        console.log(`[DeepSeek翻译] 最终翻译结果:`, result);
        return result;
      }

      throw new Error('无法从DeepSeek响应中提取JSON结果');
    } catch (error) {
      console.error('[DeepSeek翻译] 解析翻译结果失败:', error);
      throw new Error(`解析DeepSeek翻译结果失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async generateText(prompt: string): Promise<string> {
    try {
      console.log(`[DeepSeek文本生成] 开始生成，模型: ${this.model}`);

      const requestBody = {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      };

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`DeepSeek API 错误: ${response.status} ${error}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('DeepSeek返回空内容');
      }

      console.log(`[DeepSeek文本生成] 生成完成，内容长度: ${content.length}`);
      return content;

    } catch (error) {
      console.error('[DeepSeek文本生成] 生成失败:', error);
      throw new Error(`DeepSeek文本生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}