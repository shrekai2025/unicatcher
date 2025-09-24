/**
 * Anthropic Claude 服务实现
 * 支持 Claude 4 等模型
 */

import Anthropic from '@anthropic-ai/sdk';
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

export class AnthropicService extends BaseAIService {
  private client: Anthropic;
  private model: string;

  constructor(config: AIConfig) {
    super();

    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://gaccode.com/claudecode',
    });

    this.model = config.model || 'claude-3-5-sonnet-20241022';
  }

  async validateConfig(): Promise<boolean> {
    try {
      // 发送一个简单的测试请求验证配置
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ]
      });
      return true;
    } catch (error) {
      console.error('[AnthropicService] 配置验证失败:', error);
      return false;
    }
  }

  async analyzeTweet(
    tweetContent: string,
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>,
    systemPrompt?: string
  ): Promise<TweetAnalysisResult> {
    try {
      // 准备提示词
      const topicTagsText = topicTags.map(tag =>
        tag.description ? `${tag.name}: ${tag.description}` : tag.name
      ).join('\n   - ');

      const contentTypesText = contentTypes.map(type =>
        type.description ? `${type.name}: ${type.description}` : type.name
      ).join('\n   - ');

      const finalSystemPrompt = (systemPrompt || defaultSystemPrompt)
        .replace('{TOPIC_TAGS}', topicTagsText)
        .replace('{CONTENT_TYPES}', contentTypesText);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        temperature: 0.1,
        system: finalSystemPrompt,
        messages: [
          {
            role: 'user',
            content: `请分析以下推文内容：\n\n${tweetContent}`
          }
        ]
      });

      // 解析响应
      const textContent = response.content[0];
      if (textContent.type !== 'text') {
        throw new Error('意外的响应格式');
      }

      const result = this.parseAnalysisResult(textContent.text);
      return result;

    } catch (error) {
      console.error('[AnthropicService] 推文分析失败:', error);
      throw new Error(`推文分析失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    const results: BatchAnalysisResult[] = [];
    const startTime = Date.now();

    // 准备提示词模板
    const topicTagsText = topicTags.map(tag =>
      tag.description ? `${tag.name}: ${tag.description}` : tag.name
    ).join('\n   - ');

    const contentTypesText = contentTypes.map(type =>
      type.description ? `${type.name}: ${type.description}` : type.name
    ).join('\n   - ');

    const finalSystemPrompt = (systemPrompt || defaultSystemPrompt)
      .replace('{TOPIC_TAGS}', topicTagsText)
      .replace('{CONTENT_TYPES}', contentTypesText);

    // 批量处理（Claude支持较长的上下文，可以一次处理多条）
    const batchSize = 5;
    for (let i = 0; i < tweets.length; i += batchSize) {
      const batch = tweets.slice(i, i + batchSize);

      try {
        // 构建批量分析的消息
        const batchContent = batch.map((tweet, index) =>
          `推文${index + 1} (ID: ${tweet.id}):\n${tweet.content}\n`
        ).join('\n---\n\n');

        const prompt = `请分析以下${batch.length}条推文，为每条推文返回独立的分析结果。请按照推文顺序返回JSON数组：

${batchContent}

请返回以下格式的JSON数组：
[
  {
    "tweetId": "${batch[0].id}",
    "isValueless": false,
    "keywords": ["关键词1", "关键词2"],
    "topicTags": ["匹配的标签"],
    "contentTypes": ["内容类型"]
  },
  ...
]`;

        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: 4000,
          temperature: 0.1,
          system: finalSystemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        const textContent = response.content[0];
        if (textContent.type !== 'text') {
          throw new Error('意外的响应格式');
        }

        // 解析批量结果
        const batchResults = this.parseBatchAnalysisResult(textContent.text, batch);
        results.push(...batchResults);

      } catch (error) {
        console.error('[AnthropicService] 批量分析失败:', error);
        // 添加失败的结果
        for (const tweet of batch) {
          results.push({
            tweetId: tweet.id,
            result: null,
            error: error instanceof Error ? error.message : 'Analysis failed'
          });
        }
      }

      // 更新进度
      if (onProgress) {
        const processed = Math.min(i + batchSize, tweets.length);
        const successful = results.filter(r => r.result !== null).length;
        const failed = results.filter(r => r.result === null).length;

        onProgress({
          processed,
          total: tweets.length,
          successful,
          failed,
          startTime,
          estimatedTimeRemaining: this.estimateTimeRemaining(startTime, processed, tweets.length)
        });
      }

      // 避免请求过于频繁
      if (i + batchSize < tweets.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  async analyzeTweetsBatch(
    tweets: Array<{ id: string; content: string }>,
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>,
    systemPrompt?: string,
    onProgress?: (stats: ProcessingStats) => void,
    batchId?: string
  ): Promise<BatchAnalysisResult[]> {
    // 传统模式：逐一处理
    const results: BatchAnalysisResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];

      try {
        const result = await this.analyzeTweet(tweet.content, topicTags, contentTypes, systemPrompt);
        results.push({
          tweetId: tweet.id,
          result
        });
      } catch (error) {
        results.push({
          tweetId: tweet.id,
          result: null,
          error: error instanceof Error ? error.message : 'Analysis failed'
        });
      }

      // 更新进度
      if (onProgress) {
        const processed = i + 1;
        const successful = results.filter(r => r.result !== null).length;
        const failed = results.filter(r => r.result === null).length;

        onProgress({
          processed,
          total: tweets.length,
          successful,
          failed,
          startTime,
          estimatedTimeRemaining: this.estimateTimeRemaining(startTime, processed, tweets.length)
        });
      }

      // 避免请求过于频繁
      if (i < tweets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  async translateTweet(
    content: string,
    targetLanguage: string = 'zh-CN'
  ): Promise<TranslationResult> {
    try {
      const prompt = `请将以下文本翻译成${targetLanguage === 'zh-CN' ? '简体中文' : targetLanguage}。
如果原文已经是目标语言，请直接返回原文。

请按以下JSON格式返回：
{
  "translatedContent": "翻译后的内容",
  "originalLanguage": "原文语言代码",
  "isTranslated": true
}

原文：
${content}`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const textContent = response.content[0];
      if (textContent.type !== 'text') {
        throw new Error('意外的响应格式');
      }

      const result = this.parseTranslationResult(textContent.text);
      return result;

    } catch (error) {
      console.error('[AnthropicService] 翻译失败:', error);
      throw new Error(`翻译失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const textContent = response.content[0];
      if (textContent.type !== 'text') {
        throw new Error('意外的响应格式');
      }

      return textContent.text;

    } catch (error) {
      console.error('[AnthropicService] 文本生成失败:', error);
      throw new Error(`文本生成失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getProviderName(): string {
    return 'Anthropic Claude';
  }

  getSupportedModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }

  // 辅助方法：解析分析结果
  private parseAnalysisResult(text: string): TweetAnalysisResult {
    try {
      // 尝试提取JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法找到JSON格式的响应');
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        isValueless: Boolean(result.isValueless),
        keywords: Array.isArray(result.keywords) ? result.keywords : [],
        topicTags: Array.isArray(result.topicTags) ? result.topicTags : [],
        contentTypes: Array.isArray(result.contentTypes) ? result.contentTypes : []
      };
    } catch (error) {
      console.error('[AnthropicService] JSON解析失败:', text);
      // 返回默认结果
      return {
        isValueless: false,
        keywords: [],
        topicTags: [],
        contentTypes: []
      };
    }
  }

  // 辅助方法：解析批量分析结果
  private parseBatchAnalysisResult(
    text: string,
    tweets: Array<{ id: string; content: string }>
  ): BatchAnalysisResult[] {
    try {
      // 尝试提取JSON数组
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('无法找到JSON数组格式的响应');
      }

      const results = JSON.parse(jsonMatch[0]);

      return tweets.map((tweet, index) => {
        const result = results[index];
        if (result) {
          return {
            tweetId: tweet.id,
            result: {
              isValueless: Boolean(result.isValueless),
              keywords: Array.isArray(result.keywords) ? result.keywords : [],
              topicTags: Array.isArray(result.topicTags) ? result.topicTags : [],
              contentTypes: Array.isArray(result.contentTypes) ? result.contentTypes : []
            }
          };
        } else {
          return {
            tweetId: tweet.id,
            result: null,
            error: 'Missing result in batch response'
          };
        }
      });
    } catch (error) {
      console.error('[AnthropicService] 批量JSON解析失败:', text);
      // 返回失败结果
      return tweets.map(tweet => ({
        tweetId: tweet.id,
        result: null,
        error: 'Batch parsing failed'
      }));
    }
  }

  // 辅助方法：解析翻译结果
  private parseTranslationResult(text: string): TranslationResult {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法找到JSON格式的响应');
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        translatedContent: result.translatedContent || text,
        originalLanguage: result.originalLanguage || 'unknown',
        isTranslated: Boolean(result.isTranslated),
        confidence: result.confidence
      };
    } catch (error) {
      console.error('[AnthropicService] 翻译JSON解析失败:', text);
      // 返回原文
      return {
        translatedContent: text,
        originalLanguage: 'unknown',
        isTranslated: false
      };
    }
  }

  // 辅助方法：估算剩余时间
  private estimateTimeRemaining(startTime: number, processed: number, total: number): number {
    if (processed === 0) return 0;

    const elapsed = Date.now() - startTime;
    const avgTimePerItem = elapsed / processed;
    const remaining = total - processed;

    return Math.ceil(remaining * avgTimePerItem);
  }
}