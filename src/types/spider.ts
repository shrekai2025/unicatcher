/**
 * UniCatcher 爬虫系统类型定义
 */

// 任务状态枚举
export type TaskStatus = 'created' | 'queued' | 'running' | 'completed' | 'failed';

// 任务类型枚举
export type TaskType = 'twitter_list' | 'youtube_channel';

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
  isReply: boolean;              // 是否为回复推文
  imageUrls?: string[];          // 推文配图URL数组（不含用户头像）
  profileImageUrl?: string;      // 用户头像URL
  videoUrls?: {                  // 视频相关URLs
    preview?: string;            // 视频预览图URL
    video?: string;              // 视频文件URL
  };
  tweetUrl: string;              // 推文链接
  publishedAt: number;           // 发推时间戳 (JavaScript number，存储时转为bigint)
  listId: string;                // 来源List ID
  scrapedAt: number;             // 爬取时间戳 (JavaScript number，存储时转为bigint)
  
  // 逻辑删除相关字段
  isDeleted?: boolean;           // 是否已被逻辑删除
  deletedAt?: Date;              // 删除时间
  deletedBy?: string;            // 删除操作的用户
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
    // Twitter 字段
    tweetCount?: number;
    skippedRetweetCount?: number;
    skippedReplyCount?: number;      // 跳过的被回复推文数量
    // YouTube 字段
    videoCount?: number;
    // 通用字段
    duplicateCount: number;
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

// ==================== YouTube 相关类型定义 ====================

// YouTube 视频数据接口
export interface YouTubeVideoData {
  id: string;                    // 视频ID (从URL提取)
  title: string;                 // 视频标题
  description?: string;          // 视频描述
  channelName: string;           // 频道名称
  channelHandle: string;         // 频道句柄 (@handle)
  channelUrl: string;            // 频道链接
  videoUrl: string;              // 视频链接
  thumbnailUrl: string;          // 视频缩略图
  duration: string;              // 视频时长 (格式化字符串，如 "5:23")
  viewCount: number;             // 播放次数
  likeCount?: number;            // 点赞数 (可能不可见)
  publishedAt: string;           // 发布时间文本 (如 "2 days ago")
  publishedTimestamp?: number;   // 发布时间戳 (解析后的时间戳)
  scrapedAt: number;             // 爬取时间戳
  taskId: string;                // 关联的任务ID

  // 逻辑删除相关字段
  isDeleted?: boolean;           // 是否已被逻辑删除
  deletedAt?: Date;              // 删除时间
  deletedBy?: string;            // 删除操作的用户
}

// YouTube 任务配置基础接口
export interface BaseTaskConfig {
  type: TaskType;
  id?: string;
  priority?: number;
  maxRetries?: number;
}

// Twitter 任务配置 (扩展现有)
export interface TwitterTaskConfig extends BaseTaskConfig {
  type: 'twitter_list';
  listId: string;
  maxTweets?: number;
  duplicateStopCount?: number;
}

// YouTube 任务配置
export interface YouTubeTaskConfig extends BaseTaskConfig {
  type: 'youtube_channel';
  usernames: string[];           // 频道用户名数组 (如 ["@username1", "@username2"])
  maxVideosPerChannel?: number;  // 每个频道最大视频数
  duplicateStopCount?: number;   // 连续重复停止数量，默认3
}

// YouTube 频道配置（用于执行器的内部使用）
export interface YouTubeChannelConfig {
  channelHandle: string;         // YouTube 频道 handle
  maxVideos?: number;            // 最大视频数量
  duplicateStopCount?: number;   // 重复停止计数
}

// 统一任务配置类型
export type TaskConfig = TwitterTaskConfig | YouTubeTaskConfig;

// YouTube 页面处理结果
export interface YouTubePageProcessResult {
  newVideos: YouTubeVideoData[];
  duplicateCount: number;         // 与数据库重复的数量
  taskInternalDuplicates: number; // 任务内重复数量
  shouldContinue: boolean;
  totalProcessed: number;
  channelName: string;            // 当前处理的频道名称
}

// YouTube 选择器配置
export interface YouTubeSelectors {
  // 容器选择器
  videosContainer: string;
  videoContainer: string;

  // 基础信息选择器
  videoTitle: string;
  videoUrl: string;
  thumbnail: string;
  duration: string;
  viewCount: string;
  publishedAt: string;

  // 频道信息选择器
  channelName: string;
  channelHandle: string;
  channelUrl: string;

  // 交互数据选择器
  likeCount: string;

  // 导航和加载选择器
  loadMoreButton: string;
  scrollContainer: string;
}

// 统一任务接口 (替换原有 SpiderTask)
export interface UnifiedTask {
  id: string;
  type: TaskType;
  // Twitter 字段
  listId?: string;              // Twitter List ID (仅 Twitter 任务)
  // YouTube 字段
  usernames?: string[];         // YouTube 频道用户名数组 (仅 YouTube 任务)
  maxVideos?: number;           // 最大视频数 (仅 YouTube 任务)
  // 通用字段
  status: TaskStatus;
  result?: string;              // 结果信息(JSON格式)
  itemCount: number;            // 数据项数量 (推文数或视频数)
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 向后兼容：SpiderTaskConfig 已在上方定义，无需重复导出 