/**
 * Tweet Processor Manager
 * 负责管理推文处理任务的并发执行和状态管理
 */

import { db } from '~/server/db';
import type {
  TweetProcessTaskType,
  TweetProcessTaskStatus,
  TaskExecutionContext,
  ProcessorManagerConfig,
  TweetUpdateRequest,
  TweetUpdateResult,
  CommentCrawlRequest,
  CommentCrawlResult,
  CommentGenerateRequest,
  CommentGenerateResult,
  TaskStatusResult,
  ErrorCode
} from './types';
import { CommentGenerator } from './generators/comment-generator';

export class TweetProcessorManager {
  private static instance: TweetProcessorManager | null = null;
  private runningTasks: Map<string, TaskExecutionContext> = new Map();
  private recentUpdates: Map<string, number> = new Map(); // tweetId -> timestamp

  private readonly config: ProcessorManagerConfig = {
    maxConcurrentTasks: 10,
    taskTimeout: 300000, // 5分钟
    cacheUpdateInterval: 10 * 60 * 1000, // 10分钟
  };

  private constructor() {
    // 定期清理过期的更新记录
    setInterval(() => {
      this.cleanupExpiredUpdates();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TweetProcessorManager {
    if (!TweetProcessorManager.instance) {
      TweetProcessorManager.instance = new TweetProcessorManager();
    }
    return TweetProcessorManager.instance;
  }

  /**
   * 提交评论爬取任务
   */
  async submitCommentCrawlTask(request: CommentCrawlRequest): Promise<string> {
    const { tweetId, incremental = false, maxScrolls = 20 } = request;

    // 检查并发限制
    if (this.runningTasks.size >= this.config.maxConcurrentTasks) {
      throw this.createError('MAX_CONCURRENT_REACHED', `并发任务数已达上限: ${this.config.maxConcurrentTasks}`);
    }

    // 检查是否有相同任务正在运行
    const existingTaskKey = `${tweetId}:crawl_comments`;
    if (this.runningTasks.has(existingTaskKey)) {
      throw this.createError('TASK_ALREADY_RUNNING', `推文 ${tweetId} 的评论爬取任务正在运行中`);
    }

    // 检查推文是否存在于数据库
    const existingTweet = await db.tweet.findUnique({
      where: { id: tweetId },
      select: { id: true }
    });

    if (!existingTweet) {
      throw this.createError('TWEET_NOT_IN_DATABASE', `推文 ${tweetId} 不存在于数据库中`);
    }

    // 创建任务记录
    const task = await db.tweetProcessTask.create({
      data: {
        tweetId,
        taskType: 'crawl_comments',
        status: 'queued',
      },
    });

    // 异步执行任务
    this.executeCommentCrawlTaskAsync(task.id, tweetId, { incremental, maxScrolls });

    return task.id;
  }

  /**
   * 提交推文数据更新任务
   */
  async submitUpdateTask(request: TweetUpdateRequest): Promise<string> {
    const { tweetId, force = false } = request;

    // 检查并发限制
    if (this.runningTasks.size >= this.config.maxConcurrentTasks) {
      throw this.createError('MAX_CONCURRENT_REACHED', `并发任务数已达上限: ${this.config.maxConcurrentTasks}`);
    }

    // 检查是否有相同任务正在运行
    const existingTaskKey = `${tweetId}:update_data`;
    if (this.runningTasks.has(existingTaskKey)) {
      throw this.createError('TASK_ALREADY_RUNNING', `推文 ${tweetId} 的更新任务正在运行中`);
    }

    // 检查10分钟内是否已更新（除非强制更新）
    if (!force) {
      const lastUpdate = await this.getLastUpdateTime(tweetId, 'update_data');
      if (lastUpdate && Date.now() - lastUpdate.getTime() < this.config.cacheUpdateInterval) {
        throw this.createError('RECENTLY_UPDATED', `推文 ${tweetId} 在10分钟内已更新，最后更新时间: ${this.formatDateTime(lastUpdate)}`);
      }
    }

    // 检查推文是否存在于数据库
    const existingTweet = await db.tweet.findUnique({
      where: { id: tweetId },
      select: { id: true, replyCount: true, retweetCount: true, likeCount: true, viewCount: true }
    });

    if (!existingTweet) {
      throw this.createError('TWEET_NOT_IN_DATABASE', `推文 ${tweetId} 不存在于数据库中`);
    }

    // 创建任务记录
    const task = await db.tweetProcessTask.create({
      data: {
        tweetId,
        taskType: 'update_data',
        status: 'queued',
      },
    });

    // 异步执行任务
    this.executeUpdateTaskAsync(task.id, tweetId, existingTweet);

    return task.id;
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResult> {
    const task = await db.tweetProcessTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw this.createError('INVALID_REQUEST', `任务 ${taskId} 不存在`);
    }

    const result: TaskStatusResult = {
      taskId: task.id,
      tweetId: task.tweetId,
      taskType: task.taskType as TweetProcessTaskType,
      status: task.status as TweetProcessTaskStatus,
      startedAt: task.startedAt?.toISOString(),
      completedAt: task.completedAt?.toISOString(),
      errorMessage: task.errorMessage || undefined,
    };

    if (task.result) {
      try {
        result.result = JSON.parse(task.result);
      } catch (error) {
        console.error('解析任务结果失败:', error);
      }
    }

    return result;
  }

  /**
   * 异步执行评论爬取任务
   */
  private async executeCommentCrawlTaskAsync(
    taskId: string,
    tweetId: string,
    options: { incremental: boolean; maxScrolls: number }
  ): Promise<void> {
    const taskKey = `${tweetId}:crawl_comments`;

    // 创建执行上下文
    const context: TaskExecutionContext = {
      taskId,
      tweetId,
      taskType: 'crawl_comments',
      startTime: Date.now(),
    };

    // 设置超时
    context.timeoutId = setTimeout(() => {
      this.handleTaskTimeout(taskKey, context);
    }, this.config.taskTimeout);

    // 注册运行中的任务
    this.runningTasks.set(taskKey, context);

    try {
      // 更新任务状态为运行中
      await db.tweetProcessTask.update({
        where: { id: taskId },
        data: {
          status: 'running',
          startedAt: new Date(),
        },
      });

      console.log(`开始执行评论爬取任务: ${tweetId}`);

      // 执行实际的评论爬取逻辑
      const result = await this.executeCommentCrawl(tweetId, options);

      // 更新任务状态为完成
      await db.tweetProcessTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          lastUpdatedAt: new Date(),
          result: JSON.stringify(result),
        },
      });

      console.log(`评论爬取任务完成: ${tweetId}`);

    } catch (error) {
      console.error(`评论爬取任务失败: ${tweetId}`, error);

      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const result: CommentCrawlResult = {
        success: false,
        sessionId: '',
        totalComments: 0,
        newComments: 0,
        comments: [],
        hasMore: false,
        error: errorMessage,
        message: `评论爬取失败: ${errorMessage}`,
      };

      // 更新任务状态为失败
      await db.tweetProcessTask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage,
          result: JSON.stringify(result),
        },
      });

    } finally {
      // 清理执行上下文
      if (context.timeoutId) {
        clearTimeout(context.timeoutId);
      }
      this.runningTasks.delete(taskKey);
    }
  }

  /**
   * 异步执行推文更新任务
   */
  private async executeUpdateTaskAsync(
    taskId: string,
    tweetId: string,
    existingTweet: any
  ): Promise<void> {
    const taskKey = `${tweetId}:update_data`;

    // 创建执行上下文
    const context: TaskExecutionContext = {
      taskId,
      tweetId,
      taskType: 'update_data',
      startTime: Date.now(),
    };

    // 设置超时
    context.timeoutId = setTimeout(() => {
      this.handleTaskTimeout(taskKey, context);
    }, this.config.taskTimeout);

    // 注册运行中的任务
    this.runningTasks.set(taskKey, context);

    try {
      // 更新任务状态为运行中
      await db.tweetProcessTask.update({
        where: { id: taskId },
        data: {
          status: 'running',
          startedAt: new Date(),
        },
      });

      console.log(`开始执行推文更新任务: ${tweetId}`);

      // 执行实际的更新逻辑（这里先用模拟实现）
      const result = await this.executeTweetUpdate(tweetId, existingTweet);

      // 更新任务状态为完成
      await db.tweetProcessTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          lastUpdatedAt: new Date(),
          result: JSON.stringify(result),
        },
      });

      console.log(`推文更新任务完成: ${tweetId}`);

    } catch (error) {
      console.error(`推文更新任务失败: ${tweetId}`, error);

      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const result: TweetUpdateResult = {
        success: false,
        message: `推文更新失败: ${errorMessage}`,
        error: {
          code: 'BROWSER_ERROR',
          message: errorMessage,
        },
      };

      // 更新任务状态为失败
      await db.tweetProcessTask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage,
          result: JSON.stringify(result),
        },
      });

    } finally {
      // 清理执行上下文
      if (context.timeoutId) {
        clearTimeout(context.timeoutId);
      }
      this.runningTasks.delete(taskKey);

      // 记录更新时间
      this.recentUpdates.set(tweetId, Date.now());
    }
  }

  /**
   * 执行评论爬取
   */
  private async executeCommentCrawl(
    tweetId: string,
    options: { incremental: boolean; maxScrolls: number }
  ): Promise<CommentCrawlResult> {
    const { CommentCrawler } = await import('./comments/comment-crawler');

    const crawler = new CommentCrawler();

    try {
      const request: CommentCrawlRequest = {
        tweetId,
        incremental: options.incremental,
        maxScrolls: options.maxScrolls,
      };

      const result = await crawler.crawlComments(request);
      return result;

    } catch (error) {
      throw error;
    }
  }

  /**
   * 执行推文数据更新
   */
  private async executeTweetUpdate(tweetId: string, existingTweet: any): Promise<TweetUpdateResult> {
    const { TweetUpdater } = await import('./updater/tweet-updater');
    const { TweetProcessorStorage } = await import('./storage/tweet-storage');

    const updater = new TweetUpdater();
    const storage = new TweetProcessorStorage();

    try {
      const oldData = {
        replyCount: existingTweet.replyCount,
        retweetCount: existingTweet.retweetCount,
        likeCount: existingTweet.likeCount,
        viewCount: existingTweet.viewCount,
      };

      // 执行实际的推文更新
      const result = await updater.updateTweetData(tweetId, oldData);

      // 如果有数据变化，更新数据库
      if (result.success && result.data?.hasChanges) {
        await storage.updateTweetSocialData(tweetId, result.data.newData);
        await storage.recordSocialDataUpdate(tweetId, oldData, result.data.newData);
      }

      return result;

    } catch (error) {
      // 确保清理更新器资源
      await updater.forceTerminate();
      throw error;
    }
  }

  /**
   * 处理任务超时
   */
  private async handleTaskTimeout(taskKey: string, context: TaskExecutionContext): Promise<void> {
    console.error(`任务超时: ${context.taskId}`);

    try {
      const result: TweetUpdateResult = {
        success: false,
        message: '任务执行超时',
        error: {
          code: 'TASK_TIMEOUT',
          message: `任务执行超过 ${this.config.taskTimeout / 1000} 秒限制`,
        },
      };

      await db.tweetProcessTask.update({
        where: { id: context.taskId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: '任务执行超时',
          result: JSON.stringify(result),
        },
      });
    } catch (error) {
      console.error('更新超时任务状态失败:', error);
    }

    // 清理运行中的任务
    this.runningTasks.delete(taskKey);
  }

  /**
   * 获取最后更新时间
   */
  private async getLastUpdateTime(tweetId: string, taskType: string): Promise<Date | null> {
    const lastTask = await db.tweetProcessTask.findFirst({
      where: {
        tweetId,
        taskType,
        status: 'completed',
        lastUpdatedAt: { not: null },
      },
      orderBy: { lastUpdatedAt: 'desc' },
      select: { lastUpdatedAt: true },
    });

    return lastTask?.lastUpdatedAt || null;
  }

  /**
   * 清理过期的更新记录
   */
  private cleanupExpiredUpdates(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [tweetId, timestamp] of this.recentUpdates.entries()) {
      if (now - timestamp > this.config.cacheUpdateInterval) {
        expiredKeys.push(tweetId);
      }
    }

    expiredKeys.forEach(key => this.recentUpdates.delete(key));
  }

  /**
   * 格式化日期时间
   */
  private formatDateTime(date: Date): string {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/\//g, '.').replace(',', '');
  }

  /**
   * 创建错误对象
   */
  private createError(code: keyof typeof ErrorCode, message: string): Error & { code: string } {
    const error = new Error(message) as Error & { code: string };
    error.code = code;
    return error;
  }

  /**
   * 获取运行状态
   */
  getStatus(): {
    runningTasks: number;
    maxConcurrentTasks: number;
    runningTaskDetails: Array<{
      taskId: string;
      tweetId: string;
      taskType: string;
      runningTime: number;
    }>;
  } {
    const now = Date.now();
    const runningTaskDetails = Array.from(this.runningTasks.values()).map(context => ({
      taskId: context.taskId,
      tweetId: context.tweetId,
      taskType: context.taskType,
      runningTime: now - context.startTime,
    }));

    return {
      runningTasks: this.runningTasks.size,
      maxConcurrentTasks: this.config.maxConcurrentTasks,
      runningTaskDetails,
    };
  }

  /**
   * 强制取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    // 查找并移除运行中的任务
    for (const [taskKey, context] of this.runningTasks.entries()) {
      if (context.taskId === taskId) {
        if (context.timeoutId) {
          clearTimeout(context.timeoutId);
        }
        this.runningTasks.delete(taskKey);
        break;
      }
    }

    // 更新数据库状态
    await db.tweetProcessTask.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: '任务被用户取消',
      },
    });

    console.log(`任务已取消: ${taskId}`);
  }

  /**
   * AI生成评论
   */
  async generateComments(request: CommentGenerateRequest): Promise<CommentGenerateResult> {
    try {
      console.log(`[AI评论生成] 开始处理请求: ${request.tweetId}`);

      // 检查推文是否存在
      let tweet = await db.tweet.findUnique({
        where: { id: request.tweetId },
      });

      // 如果推文不存在但请求中包含内容数据（X Helper场景），创建临时推文对象
      if (!tweet && request.content) {
        console.log(`[AI评论生成] 推文不在数据库中，使用请求中的内容数据创建临时推文对象`);
        tweet = {
          id: request.tweetId,
          content: request.content,
          userNickname: request.authorNickname || '未知用户',
          userUsername: request.authorUsername || 'unknown',
          tweetUrl: request.tweetUrl || '',
          // 其他必需字段使用默认值
          replyCount: 0,
          retweetCount: 0,
          likeCount: 0,
          viewCount: 0,
          isRT: false,
          isReply: false,
          imageUrls: null,
          profileImageUrl: null,
          videoUrls: null,
          publishedAt: BigInt(Date.now()),
          listId: '',
          scrapedAt: BigInt(Date.now()),
          analysisStatus: null,
          syncedAt: null,
          analyzedAt: null,
          analysisBatchId: null,
          keywords: null,
          topicTags: null,
          contentTypes: null,
          isValueless: null,
          aiProcessedAt: null,
          aiProcessStatus: null,
          aiRetryCount: 0,
          translatedContent: null,
          originalLanguage: null,
          isTranslated: false,
          translationProvider: null,
          translationModel: null,
          translatedAt: null,
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          taskId: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else if (!tweet) {
        return {
          success: false,
          message: '推文不存在',
          error: {
            code: 'TWEET_NOT_FOUND',
            message: `推文 ${request.tweetId} 不存在`
          }
        };
      }

      // 使用评论生成器处理请求
      const generator = new CommentGenerator();
      const result = await generator.generateComments(request, tweet);

      console.log(`[AI评论生成] 处理完成: ${result.success ? '成功' : '失败'}`);
      return result;

    } catch (error) {
      console.error('[AI评论生成] 处理失败:', error);

      return {
        success: false,
        message: '评论生成失败',
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '未知错误'
        }
      };
    }
  }
}