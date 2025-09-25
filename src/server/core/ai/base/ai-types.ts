/**
 * AI服务通用类型定义
 */

export type AIProvider = 'openai' | 'openai-badger' | 'zhipu' | 'anthropic';

// 向后兼容的类型别名
export type { AIProvider as AIProviderType };

export interface AIConfig {
  apiKey: string;
  provider: AIProvider;
  model: string;
  baseURL?: string;
}

export interface TweetAnalysisResult {
  isValueless: boolean;
  keywords: string[];
  topicTags: string[];
  contentTypes: string[];
}

export interface ProcessingStats {
  processed: number;
  total: number;
  successful: number;
  failed: number;
  startTime: number;
  estimatedTimeRemaining?: number;
}

export interface AIRequestDetails {
  timestamp: string;
  batchId?: string;
  tweets: Array<{ id: string; content: string }>;
  aiConfig: Omit<AIConfig, 'apiKey'> & { apiKey: string };
  systemPrompt?: string;
  requestBody: any;
}

export interface AIResponseDetails {
  timestamp: string;
  batchId?: string;
  success: boolean;
  processingTime: number;
  tweetsProcessed: number;
  responseBody?: any;
  error?: string;
}

export interface BatchAnalysisResult {
  tweetId: string;
  result: TweetAnalysisResult | null;
  error?: string;
}

export interface TranslationResult {
  translatedContent: string;
  originalLanguage: string;
  isTranslated: boolean;
  confidence?: number; // 翻译置信度（可选）
}
