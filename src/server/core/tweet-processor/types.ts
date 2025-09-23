/**
 * Tweet Processor 模块类型定义
 * 支持推文数据更新、评论获取、AI评论生成等功能
 */

// 任务类型枚举
export type TweetProcessTaskType = 'update_data' | 'crawl_comments' | 'generate_comments';

// 任务状态枚举
export type TweetProcessTaskStatus = 'queued' | 'running' | 'completed' | 'failed';

// 推文数据更新请求
export interface TweetUpdateRequest {
  tweetId: string;
  force?: boolean; // 是否强制更新（忽略10分钟限制）
}

// 推文数据更新结果
export interface TweetUpdateResult {
  success: boolean;
  message: string;
  data?: {
    tweetId: string;
    oldData: SocialMetrics;
    newData: SocialMetrics;
    hasChanges: boolean;
    lastUpdatedAt: string; // 格式: 2025.3.2 13:35:55
  };
  error?: {
    code: string;
    message: string;
  };
}

// 社交数据指标
export interface SocialMetrics {
  replyCount: number;
  retweetCount: number;
  likeCount: number;
  viewCount: number;
}

// 推文详情页数据
export interface TweetDetailData extends SocialMetrics {
  id: string;
  content: string;
  userNickname: string;
  userUsername: string;
  tweetUrl: string;
  publishedAt: number;
  scrapedAt: number;
}

// 评论爬取请求
export interface CommentCrawlRequest {
  tweetId: string;
  incremental?: boolean; // 是否增量更新，默认true
  maxScrolls?: number; // 最大滚动次数
}

// 评论数据
export interface CommentData {
  commentId: string;
  content: string;
  authorUsername: string;
  authorNickname: string;
  authorProfileImage?: string;
  replyCount: number;
  likeCount: number;
  publishedAt: number;
  scrapedAt: number;
  isReply: boolean;
  parentCommentId?: string;
  tweetId: string;
}

// 评论爬取会话
export interface CommentCrawlSession {
  id: string;
  tweetId: string;
  isIncremental: boolean;
  lastCommentId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalComments?: number;
  newComments?: number;
  createdAt: Date;
  completedAt?: Date;
}

// 评论爬取结果
export interface CommentCrawlResult {
  success: boolean;
  sessionId: string;
  totalComments: number;
  newComments: number;
  comments: CommentData[];
  hasMore: boolean;
  message: string;
  error?: string;
}

// AI评论生成请求
export interface CommentGenerateRequest {
  tweetId: string;
  userInfo?: string; // 用户提供的额外信息
  systemPrompt?: string; // 自定义系统提示词
  includeExistingComments?: boolean; // 是否基于现有评论，默认false
  commentCount: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 生成评论数量
  commentLength: 'short' | 'medium' | 'long'; // 评论长度
  language: 'zh-CN' | 'en-US'; // 语言：简体中文 | 美国英语
  aiConfig?: {
    apiKey: string;
    provider: 'openai' | 'openai-badger' | 'zhipu';
    model: string;
    baseURL?: string;
  }; // AI服务配置
}

// 生成的评论
export interface GeneratedComment {
  content: string;
  reasoning?: string; // 生成理由（调试用）
}

// AI评论生成结果
export interface CommentGenerateResult {
  success: boolean;
  message: string;
  data?: {
    tweetId: string;
    comments: GeneratedComment[];
    basedOnExistingComments: boolean;
    existingCommentsCount?: number; // 参考的现有评论数量
    aiProvider: string;
    aiModel: string;
    language: string;
    generatedAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// 任务状态查询结果
export interface TaskStatusResult {
  taskId: string;
  tweetId: string;
  taskType: TweetProcessTaskType;
  status: TweetProcessTaskStatus;
  result?: TweetUpdateResult | CommentCrawlResult | CommentGenerateResult;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

// Twitter详情页选择器配置
export interface TweetDetailSelectorsConfig {
  // 社交指标选择器
  replyCount: string;
  retweetCount: string;
  likeCount: string;
  viewCount: string;

  // 推文内容选择器
  tweetText: string;
  userNickname: string;
  userUsername: string;
  publishTime: string;

  // 评论区选择器
  commentSection: string;
  commentContainer: string;
  commentContent: string;
  commentAuthor: string;
  commentStats: string;
  commentTime: string;

  // 页面状态选择器
  loadingIndicator: string;
  errorMessage: string;
  loginRequired: string;
}

// 浏览器配置
export interface ProcessorBrowserConfig {
  headless: boolean;
  timeout: number;
  viewport: { width: number; height: number };
  userAgent: string;
}

// 任务管理器配置
export interface ProcessorManagerConfig {
  maxConcurrentTasks: number; // 最大并发任务数
  taskTimeout: number; // 任务超时时间（毫秒）
  cacheUpdateInterval: number; // 缓存更新间隔（毫秒）
}

// 任务执行上下文
export interface TaskExecutionContext {
  taskId: string;
  tweetId: string;
  taskType: TweetProcessTaskType;
  startTime: number;
  timeoutId?: NodeJS.Timeout;
}

// 错误代码枚举
export enum ErrorCode {
  // 通用错误
  INVALID_REQUEST = 'INVALID_REQUEST',
  TASK_TIMEOUT = 'TASK_TIMEOUT',
  BROWSER_ERROR = 'BROWSER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // 推文相关错误
  TWEET_NOT_FOUND = 'TWEET_NOT_FOUND',
  TWEET_DELETED = 'TWEET_DELETED',
  TWEET_PRIVATE = 'TWEET_PRIVATE',
  TWEET_SUSPENDED = 'TWEET_SUSPENDED',

  // 数据库错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  TWEET_NOT_IN_DATABASE = 'TWEET_NOT_IN_DATABASE',

  // 并发控制错误
  MAX_CONCURRENT_REACHED = 'MAX_CONCURRENT_REACHED',
  TASK_ALREADY_RUNNING = 'TASK_ALREADY_RUNNING',
  RECENTLY_UPDATED = 'RECENTLY_UPDATED',

  // AI相关错误
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',
  INVALID_AI_RESPONSE = 'INVALID_AI_RESPONSE',
}