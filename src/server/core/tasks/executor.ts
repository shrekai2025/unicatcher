/**
 * 任务执行器
 * 整合浏览器管理器、选择器和数据存储，执行完整的爬虫任务
 */

import { BrowserManager } from '../browser/manager';
import { TwitterSelector } from '../spider/selectors/twitter';
import { StorageService } from '../data/storage';
import type { SpiderTaskConfig, TaskResult, TweetData, TaskEndReason } from '~/types/spider';
import { config } from '~/lib/config';

export class TaskExecutor {
  private browserManager: BrowserManager | null = null;
  private twitterSelector: TwitterSelector | null = null;
  private storageService: StorageService;
  private isRunning = false;
  private timeoutId: NodeJS.Timeout | null = null;
  private isTimedOut = false;
  private isDisposed = false; // 新增：防止重复清理

  // 性能优化：智能健康检查
  private healthCheckCounter = 0;
  private readonly healthCheckInterval = 5; // 每5次滚动检查一次

  constructor() {
    this.storageService = new StorageService();
  }

  /**
   * 执行Twitter List爬取任务
   */
  async executeTwitterListTask(taskConfig: SpiderTaskConfig, taskId?: string): Promise<TaskResult> {
    const startTime = Date.now();
    let actualTaskId: string = taskId || '';

    try {
      console.log(`开始执行Twitter List爬取任务: ${taskConfig.listId}`);
      
      // 如果没有传入taskId，则创建新的任务记录（兼容直接调用的情况）
      if (!actualTaskId) {
        actualTaskId = await this.storageService.createTask(taskConfig);
      }
      
      await this.storageService.updateTaskStatus(actualTaskId, 'running');

      this.isRunning = true;
      this.isTimedOut = false;

      // 🔧 设置任务超时机制（10分钟）
      this.setTaskTimeout(actualTaskId);

      // 初始化浏览器和选择器
      await this.initializeBrowser();
      
      // 构建Twitter List URL
      const listUrl = `https://x.com/i/lists/${taskConfig.listId}`;
      
      // 导航到List页面
      await this.browserManager!.navigateToUrl(listUrl);
      
      // 检查浏览器是否在导航后仍然健康
      const isHealthyAfterNavigation = await this.browserManager!.healthCheck();
      if (!isHealthyAfterNavigation) {
        throw new Error('浏览器在页面导航后变为不健康状态');
      }
      
      // 等待Timeline加载
      await this.twitterSelector!.waitForTimeline();
      
      // 获取已存在的推文ID
      const existingTweetIds = await this.storageService.getExistingTweetIds(taskConfig.listId);
      console.log(`已存在 ${existingTweetIds.size} 条推文记录`);

      // 检查是否已超时
      if (this.isTimedOut) {
        throw new Error('任务执行超时，已被强制终止');
      }

      // 执行爬取逻辑
      const result = await this.executeCrawling(taskConfig, actualTaskId, existingTweetIds);

      // 检查是否在执行过程中超时
      if (this.isTimedOut) {
        throw new Error('任务在执行过程中超时，已被强制终止');
      }

      // 完成任务
      const executionTime = Date.now() - startTime;
      const taskResult: TaskResult = {
        success: true,
        message: `爬取完成，共获得 ${result.totalNewTweets} 条新推文 (数据库重复: ${result.totalDuplicates}, 任务内重复: ${result.totalTaskInternalDuplicates})`,
        endReason: result.endReason,
        data: {
          tweetCount: result.totalNewTweets,
          duplicateCount: result.totalDuplicates,
          skippedRetweetCount: result.totalSkippedRetweets,
          skippedReplyCount: result.totalSkippedReplies,
          executionTime,
        },
      };

      await this.storageService.updateTaskStatus(actualTaskId, 'completed', taskResult);
      console.log(`任务执行完成: ${actualTaskId}`);

      return taskResult;

    } catch (error) {
      console.error('任务执行失败:', error);
      
      const executionTime = Date.now() - startTime;
      const isTimeoutError = this.isTimedOut || (error instanceof Error && error.message.includes('超时'));
      
      const taskResult: TaskResult = {
        success: false,
        message: isTimeoutError ? 
          `任务执行超时: 超过 ${config.spider.taskTimeout / 1000} 秒限制，已强制终止` :
          `爬取失败: ${error instanceof Error ? error.message : '未知错误'}`,
        endReason: isTimeoutError ? 'TIMEOUT' : 'ERROR_OCCURRED',
        error: {
          code: isTimeoutError ? 'TASK_TIMEOUT' : 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : '未知错误',
          stack: error instanceof Error ? error.stack : undefined,
        },
        data: {
          tweetCount: 0,
          duplicateCount: 0,
          skippedRetweetCount: 0,
          skippedReplyCount: 0,
          executionTime,
        },
      };

      if (actualTaskId) {
        await this.storageService.updateTaskStatus(actualTaskId, 'failed', taskResult);
      }

      return taskResult;
    } finally {
      this.isRunning = false;
      this.isTimedOut = false;
      await this.cleanup();
    }
  }

  /**
   * 初始化浏览器和选择器
   */
  private async initializeBrowser(): Promise<void> {
    try {
      // 创建并启动浏览器（根据环境和配置自动判断headless模式）
      const browserConfig = {
        headless: config.playwright.headless, // 使用配置文件中的headless设置
        timeout: config.playwright.timeout,
        viewport: config.playwright.viewport,
        userAgent: config.spider.userAgent,
        userDataDir: config.playwright.userDataDir,
      };
      
      console.log('浏览器配置:', { headless: browserConfig.headless });
      this.browserManager = await BrowserManager.create(browserConfig);
      
      // 等待浏览器健康检查
      const isHealthy = await this.browserManager.healthCheck();
      if (!isHealthy) {
        throw new Error('浏览器健康检查失败');
      }

      // 创建Twitter选择器
      const page = await this.browserManager.getPage();
      this.twitterSelector = new TwitterSelector(page);

      console.log('浏览器和选择器初始化完成');
    } catch (error) {
      console.error('初始化浏览器失败:', error);
      throw new Error('初始化浏览器失败');
    }
  }

  /**
   * 执行爬取逻辑
   */
  private async executeCrawling(
    taskConfig: SpiderTaskConfig,
    taskId: string,
    existingTweetIds: Set<string>
  ): Promise<{
    totalNewTweets: number;
    totalDuplicates: number;
    totalTaskInternalDuplicates: number;
    totalSkippedRetweets: number;
    totalSkippedReplies: number;
    endReason: TaskEndReason;
  }> {
    let totalNewTweets = 0;
    let totalDuplicates = 0;
    let totalTaskInternalDuplicates = 0; // 任务内重复计数
    let totalSkippedRetweets = 0;
    let totalSkippedReplies = 0;
    let consecutiveDatabaseDuplicates = 0; // 只统计数据库重复
    let scrollAttempts = 0;
    let endReason: TaskEndReason = 'TARGET_REACHED'; // 默认结束原因
    
    // 全局任务级别的已处理推文ID集合
    const processedTweetIds = new Set<string>();
    
    // 滚动检测相关变量
    let lastScrollPosition = 0;
    let consecutiveNoScrollCount = 0;
    const maxConsecutiveNoScroll = 3; // 连续3次无滚动效果则终止
    
    const maxTweets = taskConfig.maxTweets || config.spider.twitterList.maxTweets;
    const maxScrollAttempts = 50; // 防止无限滚动

    console.log(`开始爬取，目标: ${maxTweets} 条推文`);

    while (totalNewTweets < maxTweets && scrollAttempts < maxScrollAttempts) {
      try {
        // 🔧 检查任务是否超时
        if (this.isTimedOut) {
          console.warn('⏰ 任务已超时，终止爬取循环');
          endReason = 'TIMEOUT';
          break;
        }

        // 添加随机延迟
        await this.addRandomDelay();

        // 处理当前页面的推文
        const pageResult = await this.twitterSelector!.processCurrentPage(
          taskConfig.listId || '0',
          existingTweetIds,
          processedTweetIds,
          taskConfig.username
        );

        // 保存新推文
        if (pageResult.newTweets.length > 0) {
          await this.storageService.saveTweets(pageResult.newTweets, taskId);
          totalNewTweets += pageResult.newTweets.length;
          
          // 更新任务推文计数
          await this.storageService.updateTaskTweetCount(taskId, totalNewTweets);
          
          console.log(`已保存 ${pageResult.newTweets.length} 条新推文，总计: ${totalNewTweets}`);
        }

        totalDuplicates += pageResult.duplicateCount;
        totalTaskInternalDuplicates += pageResult.taskInternalDuplicates;
        totalSkippedRetweets += pageResult.retweetSkipCount;
        totalSkippedReplies += pageResult.replySkipCount;

        // 检查连续数据库重复数量（不包括页面内重复）
        if (pageResult.duplicateCount > 0) {
          consecutiveDatabaseDuplicates += pageResult.duplicateCount;
        } else {
          consecutiveDatabaseDuplicates = 0; // 重置计数器
        }

        // 停止条件检查
        if (totalNewTweets >= maxTweets) {
          console.log(`✅ 已达到最大推文数量: ${maxTweets}`);
          endReason = 'TARGET_REACHED';
          break;
        }

        if (consecutiveDatabaseDuplicates >= config.spider.twitterList.duplicateStopCount) {
          console.log(`⚠️ 连续遇到 ${consecutiveDatabaseDuplicates} 条数据库重复推文，停止爬取`);
          endReason = 'CONSECUTIVE_DUPLICATES';
          break;
        }

        // 检查当前页面的推文数量，如果没有找到任何推文，可能已到底部
        if (pageResult.totalProcessed === 0 && scrollAttempts > 0) {
          console.log('🏁 当前页面没有找到任何推文，已到达底部');
          endReason = 'NO_MORE_CONTENT';
          break;
        }

        // 检查最大滚动次数
        if (scrollAttempts >= maxScrollAttempts) {
          console.log(`⏰ 已达到最大滚动次数: ${maxScrollAttempts}`);
          endReason = 'MAX_SCROLL_REACHED';
          break;
        }

        // 获取滚动前的位置
        const beforeScrollPosition = await this.browserManager!.getScrollPosition();
        
        // 先滚动加载更多内容（Twitter需要滚动才能触发无限加载）
        console.log('📜 滚动加载更多内容...');
        await this.browserManager!.scrollToBottom();
        scrollAttempts++;
        
        // 智能等待：根据获取到的内容调整延迟
        const waitTime = pageResult.newTweets.length > 0
          ? config.spider.twitterList.waitTime
          : config.spider.twitterList.waitTime * 1.5; // 无新内容时延长等待

        console.log(`⏰ 智能等待: ${waitTime}ms (新推文: ${pageResult.newTweets.length} 条)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // 检查滚动效果
        const afterScrollPosition = await this.browserManager!.getScrollPosition();
        const scrollDistance = afterScrollPosition - beforeScrollPosition;
        
        if (scrollDistance < 100) {
          consecutiveNoScrollCount++;
          console.log(`⚠️ 滚动距离很小 (${scrollDistance}px)，连续无效滚动: ${consecutiveNoScrollCount}/${maxConsecutiveNoScroll}`);
          
          if (consecutiveNoScrollCount >= maxConsecutiveNoScroll) {
            console.log(`🏁 连续 ${maxConsecutiveNoScroll} 次无效滚动，页面无法继续滚动`);
            endReason = 'NO_MORE_CONTENT';
            break;
          }
        } else {
          consecutiveNoScrollCount = 0; // 重置计数器
          console.log(`✅ 有效滚动: ${scrollDistance}px`);
        }
        
        lastScrollPosition = afterScrollPosition;
        
        console.log(`📊 滚动次数: ${scrollAttempts}, 新推文: ${totalNewTweets}, 数据库重复: ${totalDuplicates}, 任务内重复: ${pageResult.taskInternalDuplicates}, 跳过转推: ${totalSkippedRetweets}, 跳过被回复: ${totalSkippedReplies}`);

      } catch (error) {
        console.error('处理页面时出错:', error);

        // 智能健康检查：不是每次都检查
        this.healthCheckCounter++;
        if (this.healthCheckCounter >= this.healthCheckInterval) {
          console.log('🔍 执行健康检查...');
          const isHealthy = await this.browserManager!.healthCheck();
          if (!isHealthy) {
            endReason = 'ERROR_OCCURRED';
            throw new Error('浏览器不健康，无法继续爬取');
          }
          this.healthCheckCounter = 0; // 重置计数器
        }

        // 继续下一次循环
        scrollAttempts++;
      }
    }

    // 输出任务结束原因
    const endReasonMessages = {
      'TARGET_REACHED': '✅ 已达到目标推文数量',
      'CONSECUTIVE_DUPLICATES': '⚠️ 连续重复推文过多，停止爬取',
      'MAX_SCROLL_REACHED': '⏰ 达到最大滚动次数',
      'NO_MORE_CONTENT': '🏁 页面底部，无更多内容',
      'ERROR_OCCURRED': '❌ 发生错误',
      'USER_CANCELLED': '🛑 用户取消',
      'TIMEOUT': '⌛ 任务超时'
    };
    
    console.log(`📋 任务结束原因: ${endReasonMessages[endReason]}`);
    console.log(`📊 爬取完成统计 - 新推文: ${totalNewTweets}, 数据库重复: ${totalDuplicates}, 任务内重复: ${totalTaskInternalDuplicates}, 跳过转推: ${totalSkippedRetweets}, 跳过被回复: ${totalSkippedReplies}`);

    return {
      totalNewTweets,
      totalDuplicates,
      totalTaskInternalDuplicates,
      totalSkippedRetweets,
      totalSkippedReplies,
      endReason,
    };
  }

  /**
   * 设置任务超时定时器
   */
  private setTaskTimeout(taskId: string): void {
    this.clearTaskTimeout(); // 确保清理旧定时器

    this.timeoutId = setTimeout(() => {
      if (!this.isDisposed) {
        console.warn(`⏰ 任务超时警告: ${taskId} 已运行超过 ${config.spider.taskTimeout / 1000} 秒`);
        this.isTimedOut = true;
        this.forceCleanupTimeout(taskId);
      }
    }, config.spider.taskTimeout);
  }

  /**
   * 清理任务超时定时器
   */
  private clearTaskTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * 添加随机延迟
   */
  private async addRandomDelay(): Promise<void> {
    if (!config.spider.randomDelay.enabled) {
      return;
    }

    const minDelay = config.spider.randomDelay.minDelay;
    const maxDelay = config.spider.randomDelay.maxDelay;
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    
    console.log(`随机延迟: ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 清理资源 - 改进版：防止重复清理，添加超时机制
   */
  private async cleanup(): Promise<void> {
    if (this.isDisposed) return; // 防止重复清理

    this.isDisposed = true;
    this.clearTaskTimeout();

    try {
      if (this.browserManager) {
        // 添加浏览器关闭超时机制
        await Promise.race([
          this.browserManager.close(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('浏览器关闭超时')), 10000)
          )
        ]);
        this.browserManager = null;
      }
    } catch (error) {
      console.error('浏览器关闭失败，强制清理:', error);
      this.browserManager = null; // 强制清除引用
    }

    this.twitterSelector = null;
    this.isRunning = false;
    console.log('资源清理完成');
  }

  /**
   * 强制清理超时任务
   */
  private async forceCleanupTimeout(taskId: string): Promise<void> {
    try {
      console.error(`🚨 强制终止超时任务: ${taskId}`);
      
      this.isRunning = false;
      this.isTimedOut = true;
      
      // 强制关闭浏览器
      if (this.browserManager) {
        try {
          await this.browserManager.close();
        } catch (error) {
          console.error('强制关闭浏览器失败:', error);
        }
      }
      
      // 更新任务状态为失败
      await this.storageService.updateTaskStatus(taskId, 'failed', {
        success: false,
        message: `任务执行超时: 超过 ${config.spider.taskTimeout / 1000} 秒限制，已强制终止`,
        endReason: 'TIMEOUT',
        error: {
          code: 'TASK_TIMEOUT',
          message: '任务执行时间超过限制，系统自动终止',
        },
        data: {
          tweetCount: 0,
          duplicateCount: 0,
          skippedRetweetCount: 0,
          skippedReplyCount: 0,
          executionTime: config.spider.taskTimeout,
        },
      });
      
      await this.cleanup();
      console.log(`✅ 超时任务已强制清理: ${taskId}`);
    } catch (error) {
      console.error('强制清理超时任务失败:', error);
    }
  }

  /**
   * 取消任务 - 改进版：使用统一的清理方法
   */
  async cancelTask(): Promise<void> {
    this.isRunning = false;
    await this.cleanup();
    console.log('任务已取消');
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(): {
    isRunning: boolean;
    browserStatus?: {
      isRunning: boolean;
      isHealthy: boolean;
      hasPage: boolean;
    };
  } {
    const status: any = {
      isRunning: this.isRunning,
    };

    if (this.browserManager) {
      status.browserStatus = this.browserManager.getStatus();
    }

    return status;
  }

  /**
   * 重试机制包装器 - 改进版：智能重试和资源清理
   */
  async executeWithRetry(taskConfig: SpiderTaskConfig, taskId?: string): Promise<TaskResult> {
    const maxRetries = config.spider.retryAttempts;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // 每次重试前检查是否已被取消
        if (this.isDisposed) {
          throw new Error('任务已被取消');
        }

        console.log(`执行尝试 ${attempt}/${maxRetries + 1}`);
        return await this.executeTwitterListTask(taskConfig, taskId);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('未知错误');
        console.error(`执行尝试 ${attempt} 失败:`, lastError.message);

        // 清理本次尝试的资源
        await this.cleanupForRetry();

        if (attempt <= maxRetries) {
          // 智能重试延迟：指数退避
          const retryDelay = Math.min(
            config.spider.retryDelay * Math.pow(2, attempt - 1),
            30000 // 最大30秒
          );
          console.log(`${retryDelay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw lastError || new Error('重试次数耗尽');
  }

  /**
   * 重试清理 - 新增：为重试清理资源但保留实例
   */
  private async cleanupForRetry(): Promise<void> {
    try {
      if (this.browserManager) {
        await this.browserManager.close();
        this.browserManager = null;
      }
      this.twitterSelector = null;
    } catch (error) {
      console.error('重试清理失败:', error);
      // 强制清除引用
      this.browserManager = null;
      this.twitterSelector = null;
    }
  }
}

/**
 * 任务执行器单例
 */
export class TaskExecutorManager {
  private static instance: TaskExecutorManager | null = null;
  private executors: Map<string, TaskExecutor> = new Map();
  private runningTasks: Set<string> = new Set();
  private taskCreationLock = false; // 新增：防止并发创建竞态

  private constructor() {}

  static getInstance(): TaskExecutorManager {
    if (!TaskExecutorManager.instance) {
      TaskExecutorManager.instance = new TaskExecutorManager();
    }
    return TaskExecutorManager.instance;
  }

  /**
   * 提交任务 - 改进版：原子性并发控制
   */
  async submitTask(taskConfig: SpiderTaskConfig): Promise<string> {
    // 原子性检查并发限制
    if (this.taskCreationLock) {
      throw new Error('任务创建正在进行中，请稍后重试');
    }

    this.taskCreationLock = true;
    try {
      if (this.runningTasks.size >= config.spider.maxConcurrentTasks) {
        throw new Error(`并发任务数量已达上限: ${config.spider.maxConcurrentTasks}`);
      }

      // 先创建数据库任务记录，获取真实的任务ID
      const storageService = new StorageService();
      const realTaskId = await storageService.createTask(taskConfig);
      const executor = new TaskExecutor();

      // 原子性添加到运行集合
      this.executors.set(realTaskId, executor);
      this.runningTasks.add(realTaskId);

      console.log(`任务已提交: ${realTaskId}`);

      // 异步执行任务（传入真实的任务ID）
      this.executeTaskAsync(realTaskId, taskConfig, executor);
      return realTaskId;
    } finally {
      this.taskCreationLock = false;
    }
  }

  /**
   * 异步执行任务 - 改进版：确保资源完全清理
   */
  private async executeTaskAsync(
    taskId: string,
    taskConfig: SpiderTaskConfig,
    executor: TaskExecutor
  ): Promise<void> {
    try {
      const result = config.spider.enableRetry
        ? await executor.executeWithRetry(taskConfig, taskId)
        : await executor.executeTwitterListTask(taskConfig, taskId);

      console.log(`任务完成: ${taskId}`, result);
    } catch (error) {
      console.error(`任务失败: ${taskId}`, error);
    } finally {
      // 确保资源完全清理
      await this.cleanupTask(taskId, executor);
    }
  }

  /**
   * 清理任务资源 - 新增：确保完全清理
   */
  private async cleanupTask(taskId: string, executor: TaskExecutor): Promise<void> {
    try {
      // 先尝试正常取消执行器
      await executor.cancelTask();
    } catch (error) {
      console.error(`清理任务执行器失败: ${taskId}`, error);
    } finally {
      // 无论如何都要清理引用
      this.runningTasks.delete(taskId);
      this.executors.delete(taskId);
      console.log(`任务资源已清理: ${taskId}`);
    }
  }

  /**
   * 取消任务 - 改进版：使用统一的清理方法
   */
  async cancelTask(taskId: string): Promise<void> {
    const executor = this.executors.get(taskId);
    if (executor) {
      await this.cleanupTask(taskId, executor);
      console.log(`任务已取消: ${taskId}`);
    }
  }

  /**
   * 获取运行状态
   */
  getStatus(): {
    runningTasks: number;
    maxConcurrentTasks: number;
    runningTaskIds: string[];
  } {
    return {
      runningTasks: this.runningTasks.size,
      maxConcurrentTasks: config.spider.maxConcurrentTasks,
      runningTaskIds: Array.from(this.runningTasks),
    };
  }

  /**
   * 强制清理所有僵尸任务 - 用于命令行调用
   */
  async forceCleanupZombieTasks(): Promise<{
    cleaned: string[];
    total: number;
  }> {
    console.log('🧹 开始清理僵尸任务...');
    
    const cleanedTasks: string[] = [];
    const taskIds = Array.from(this.runningTasks);
    
    for (const taskId of taskIds) {
      try {
        console.log(`清理任务: ${taskId}`);
        const executor = this.executors.get(taskId);
        
        if (executor) {
          await executor.cancelTask();
        }
        
        // 强制从管理器中移除
        this.runningTasks.delete(taskId);
        this.executors.delete(taskId);
        
        // 更新数据库任务状态为失败
        const storageService = new StorageService();
        await storageService.updateTaskStatus(taskId, 'failed', {
          success: false,
          message: '任务被管理员强制清理（可能为僵尸任务）',
          endReason: 'USER_CANCELLED',
          error: {
            code: 'ADMIN_CLEANUP',
            message: '任务被管理员强制清理',
          },
        });
        
        cleanedTasks.push(taskId);
        console.log(`✅ 已清理任务: ${taskId}`);
      } catch (error) {
        console.error(`清理任务 ${taskId} 失败:`, error);
      }
    }
    
    console.log(`🎉 僵尸任务清理完成，共清理 ${cleanedTasks.length} 个任务`);
    
    return {
      cleaned: cleanedTasks,
      total: cleanedTasks.length,
    };
  }
} 