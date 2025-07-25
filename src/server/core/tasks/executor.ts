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

      // 执行爬取逻辑
      const result = await this.executeCrawling(taskConfig, actualTaskId, existingTweetIds);

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
      const taskResult: TaskResult = {
        success: false,
        message: `爬取失败: ${error instanceof Error ? error.message : '未知错误'}`,
        endReason: 'ERROR_OCCURRED',
        error: {
          code: 'EXECUTION_ERROR',
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
        // 添加随机延迟
        await this.addRandomDelay();

        // 处理当前页面的推文
        const pageResult = await this.twitterSelector!.processCurrentPage(
          taskConfig.listId,
          existingTweetIds,
          processedTweetIds
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
        
        // 等待新内容加载
        await new Promise(resolve => setTimeout(resolve, config.spider.twitterList.waitTime));
        
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
        
        // 尝试恢复：检查浏览器健康状态
        const isHealthy = await this.browserManager!.healthCheck();
        if (!isHealthy) {
          endReason = 'ERROR_OCCURRED';
          throw new Error('浏览器不健康，无法继续爬取');
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
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.browserManager) {
        await this.browserManager.close();
        this.browserManager = null;
      }
      
      this.twitterSelector = null;
      console.log('资源清理完成');
    } catch (error) {
      console.error('清理资源失败:', error);
    }
  }

  /**
   * 取消任务
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
   * 重试机制包装器
   */
  async executeWithRetry(taskConfig: SpiderTaskConfig, taskId?: string): Promise<TaskResult> {
    const maxRetries = config.spider.retryAttempts;
    const retryDelay = config.spider.retryDelay;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`执行尝试 ${attempt}/${maxRetries + 1}`);
        return await this.executeTwitterListTask(taskConfig, taskId);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('未知错误');
        console.error(`执行尝试 ${attempt} 失败:`, lastError.message);

        if (attempt <= maxRetries) {
          console.log(`${retryDelay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // 所有重试都失败了
    throw lastError || new Error('重试次数耗尽');
  }
}

/**
 * 任务执行器单例
 */
export class TaskExecutorManager {
  private static instance: TaskExecutorManager | null = null;
  private executors: Map<string, TaskExecutor> = new Map();
  private runningTasks: Set<string> = new Set();

  private constructor() {}

  static getInstance(): TaskExecutorManager {
    if (!TaskExecutorManager.instance) {
      TaskExecutorManager.instance = new TaskExecutorManager();
    }
    return TaskExecutorManager.instance;
  }

  /**
   * 提交任务
   */
  async submitTask(taskConfig: SpiderTaskConfig): Promise<string> {
    // 检查并发限制
    if (this.runningTasks.size >= config.spider.maxConcurrentTasks) {
      throw new Error(`并发任务数量已达上限: ${config.spider.maxConcurrentTasks}`);
    }

    // 先创建数据库任务记录，获取真实的任务ID
    const storageService = new StorageService();
    const realTaskId = await storageService.createTask(taskConfig);
    
    const executor = new TaskExecutor();
    
    this.executors.set(realTaskId, executor);
    this.runningTasks.add(realTaskId);

    console.log(`任务已提交: ${realTaskId}`);

    // 异步执行任务（传入真实的任务ID）
    this.executeTaskAsync(realTaskId, taskConfig, executor);

    return realTaskId;
  }

  /**
   * 异步执行任务
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
      // 清理
      this.runningTasks.delete(taskId);
      this.executors.delete(taskId);
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    const executor = this.executors.get(taskId);
    if (executor) {
      await executor.cancelTask();
      this.runningTasks.delete(taskId);
      this.executors.delete(taskId);
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
} 