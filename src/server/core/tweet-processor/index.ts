/**
 * Tweet Processor 模块统一导出
 */

// 核心管理器
export { TweetProcessorManager } from './manager';

// 类型定义
export type {
  TweetProcessTaskType,
  TweetProcessTaskStatus,
  TweetUpdateRequest,
  TweetUpdateResult,
  CommentCrawlRequest,
  CommentCrawlResult,
  CommentGenerateRequest,
  CommentGenerateResult,
  TaskStatusResult,
  SocialMetrics,
  TweetDetailData,
  CommentData,
  GeneratedComment,
  ErrorCode,
} from './types';

// 更新器组件
export { TweetUpdater } from './updater/tweet-updater';
export { TweetDetailSelectors } from './updater/selectors';

// 存储服务
export { TweetProcessorStorage } from './storage/tweet-storage';