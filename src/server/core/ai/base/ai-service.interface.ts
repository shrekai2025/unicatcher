/**
 * AI服务基础接口
 * 所有AI供应商服务必须实现此接口
 */

import type { TweetAnalysisResult, ProcessingStats, BatchAnalysisResult, TranslationResult } from './ai-types';

export abstract class BaseAIService {
  /**
   * 验证API配置是否有效
   */
  abstract validateConfig(): Promise<boolean>;

  /**
   * 分析单条推文
   */
  abstract analyzeTweet(
    tweetContent: string,
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>,
    systemPrompt?: string
  ): Promise<TweetAnalysisResult>;

  /**
   * 批量分析推文（优化模式）
   */
  abstract analyzeTweetsBatchOptimized(
    tweets: Array<{ id: string; content: string }>,
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>,
    systemPrompt?: string,
    onProgress?: (stats: ProcessingStats) => void,
    batchId?: string
  ): Promise<BatchAnalysisResult[]>;

  /**
   * 批量分析推文（传统模式）
   */
  abstract analyzeTweetsBatch(
    tweets: Array<{ id: string; content: string }>,
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>,
    systemPrompt?: string,
    onProgress?: (stats: ProcessingStats) => void,
    batchId?: string
  ): Promise<BatchAnalysisResult[]>;

  /**
   * 获取供应商名称
   */
  abstract getProviderName(): string;

  /**
   * 获取支持的模型列表
   */
  abstract getSupportedModels(): string[];

  /**
   * 翻译推文内容为简体中文
   */
  abstract translateTweet(
    content: string,
    targetLanguage?: string // 默认 'zh-CN'
  ): Promise<TranslationResult>;
}
