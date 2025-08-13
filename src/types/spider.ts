/**
 * UniCatcher 爬虫系统类型定义
 */

// 任务状态枚举
export type TaskStatus = 'created' | 'queued' | 'running' | 'completed' | 'failed';

// 任务类型枚举
export type TaskType = 'twitter_list';

// 任务结束原因枚举
export type TaskEndReason = 
  | 'TARGET_REACHED'              // 达到目标数量
  | 'CONSECUTIVE_DUPLICATES'      // 连续重复推文过多
  | 'MAX_SCROLL_REACHED'         // 达到最大滚动次数
  | 'NO_MORE_CONTENT'            // 页面底部，无更多内容
  | 'ERROR_OCCURRED'             // 发生错误
  | 'USER_CANCELLED'             // 用户取消
  | 'TIMEOUT'                    // 任务超时

// 推文数据接口
export interface TweetData {
  id: string;                    // 推文ID
  content: string;               // 推文正文
  userNickname: string;          // 用户昵称
  userUsername: string;          // 用户名(@handle)
  replyCount: number;            // 评论数
  retweetCount: number;          // 转发数  
  likeCount: number;             // 点赞数
  viewCount: number;             // 浏览数
  isRT: boolean;                 // 是否为被转推的推文
  imageUrls?: string[];          // 配图URL数组
  tweetUrl: string;              // 推文链接
  publishedAt: number;           // 发推时间戳 (JavaScript number，存储时转为bigint)
  listId: string;                // 来源List ID
  scrapedAt: number;             // 爬取时间戳 (JavaScript number，存储时转为bigint)
}

// 爬虫任务配置
export interface SpiderTaskConfig {
  listId: string;                // Twitter List ID
  maxTweets?: number;            // 最大爬取推文数量
  duplicateStopCount?: number;   // 连续重复停止数量
}

// 爬虫任务接口
export interface SpiderTask {
  id: string;
  type: TaskType;
  listId: string;
  status: TaskStatus;
  result?: string;               // 结果信息(JSON格式)
  tweetCount: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 任务执行结果
export interface TaskResult {
  success: boolean;
  message: string;
  endReason?: TaskEndReason;        // 任务结束原因
  data?: {
    tweetCount: number;
    duplicateCount: number;
    skippedRetweetCount: number;
    skippedReplyCount: number;      // 跳过的被回复推文数量
    executionTime: number;
  };
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

// 浏览器管理配置
export interface BrowserConfig {
  headless: boolean;
  timeout: number;
  viewport: { width: number; height: number };
  userAgent: string;
  userDataDir: string;
}

// Twitter选择器配置
export interface TwitterSelectors {
  // 容器选择器
  timelineContainer: string;
  tweetContainer: string;
  
  // 数据选择器
  tweetText: string;
  userNickname: string;
  userUsername: string;
  publishTime: string;
  tweetUrl: string;
  
  // 互动数据选择器
  replyCount: string;
  retweetCount: string;
  likeCount: string;
  viewCount: string;
  
  // 媒体选择器
  images: string;
  
  // Retweet识别选择器
  retweetIcon: string;
  retweetText: string;
  
  // 展开按钮选择器
  showMoreButton: string;
}

// 滚动加载配置
export interface ScrollConfig {
  scrollTrigger: number;         // 距离底部多少像素触发
  waitTime: number;              // 等待时间(毫秒)
  maxScrollAttempts: number;     // 最大滚动尝试次数
}

// 页面处理结果
export interface PageProcessResult {
  newTweets: TweetData[];
  duplicateCount: number;         // 与数据库重复的数量
  taskInternalDuplicates: number; // 任务内重复数量（跨滚动重复，不触发退出）
  retweetSkipCount: number;
  replySkipCount: number;         // 被回复推文跳过数量
  shouldContinue: boolean;
  totalProcessed: number;
} 