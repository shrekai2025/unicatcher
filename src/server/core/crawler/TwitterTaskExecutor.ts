/**
 * Twitter 任务执行器
 * 专门处理 Twitter List 爬取任务
 */

import { BaseTaskExecutor } from './BaseTaskExecutor';
import { BrowserManager } from '../browser/manager';
import { TwitterSelector } from '../spider/selectors/twitter';
import type {
  TaskConfig,
  TaskResult,
  TaskType,
  TwitterTaskConfig,
  SpiderTaskConfig,
  TaskEndReason,
  TweetData
} from '~/types/spider';
import { config } from '~/lib/config';

export class TwitterTaskExecutor extends BaseTaskExecutor {
  private twitterSelector: TwitterSelector | null = null;

  // 性能优化：智能健康检查
  private healthCheckCounter = 0;
  private readonly healthCheckInterval = 5; // 每5次滚动检查一次

  /**
   * 获取任务类型
   */
  protected getTaskType(): TaskType {
    return 'twitter_list';
  }

  /**
   * 执行 Twitter 任务
   */
  async executeTask(config: TaskConfig, taskId: string): Promise<TaskResult>;
  async executeTask(config: SpiderTaskConfig, taskId?: string): Promise<TaskResult>;
  async executeTask(configOrTaskConfig: any, taskIdOrUndefined?: string): Promise<TaskResult> {
    const startTime = Date.now();

    // 兼容性处理：支持新旧两种调用方式
    let taskConfig: SpiderTaskConfig;
    let actualTaskId: string;

    if ('type' in configOrTaskConfig) {
      // 新的 TaskConfig 格式
      const twitterConfig = configOrTaskConfig as TwitterTaskConfig;
      taskConfig = {
        listId: twitterConfig.listId,
        maxTweets: twitterConfig.maxTweets,
        duplicateStopCount: twitterConfig.duplicateStopCount
      };
      actualTaskId = taskIdOrUndefined || '';
    } else {
      // 旧的 SpiderTaskConfig 格式
      taskConfig = configOrTaskConfig;
      actualTaskId = taskIdOrUndefined || '';
    }

    try {
      console.log(`开始执行Twitter List爬取任务: ${taskConfig.listId}`);

      // 如果没有传入taskId，则创建新的任务记录（兼容直接调用的情况）
      if (!actualTaskId) {
        actualTaskId = await this.storageService.createTask(taskConfig);
      }

      await this.storageService.updateTaskStatus(actualTaskId, 'running');

      this.isRunning = true;

      // 🔧 设置任务超时机制
      this.setTaskTimeout(actualTaskId, config.spider.taskTimeout);

      // 初始化浏览器和选择器
      await this.initializeBrowser();

      const page = await this.browserManager!.getPage();
      this.twitterSelector = new TwitterSelector(page);

      // 开始爬取
      const result = await this.executeCrawling(taskConfig, actualTaskId);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log(`✅ 任务完成: ${actualTaskId}`, result);

      // 更新任务状态为完成
      await this.storageService.updateTaskStatus(actualTaskId, 'completed', {
        success: true,
        message: `爬取完成，获得 ${result.totalNewTweets} 条新推文`,
        endReason: result.endReason,
        data: {
          tweetCount: result.totalNewTweets,
          duplicateCount: result.totalDuplicates,
          skippedRetweetCount: result.totalSkippedRetweets,
          skippedReplyCount: result.totalSkippedReplies,
          executionTime,
        },
      });

      return {
        success: true,
        message: `Twitter爬取完成，共获得 ${result.totalNewTweets} 条新推文`,
        endReason: result.endReason,
        data: {
          tweetCount: result.totalNewTweets,
          duplicateCount: result.totalDuplicates,
          skippedRetweetCount: result.totalSkippedRetweets,
          skippedReplyCount: result.totalSkippedReplies,
          executionTime,
        },
      };
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.error(`❌ 任务失败: ${actualTaskId}`, error);

      // 更新任务状态为失败
      await this.storageService.updateTaskStatus(actualTaskId, 'failed', {
        success: false,
        message: `爬取失败: ${error instanceof Error ? error.message : '未知错误'}`,
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
      });

      return {
        success: false,
        message: `Twitter爬取失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : '未知错误',
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 使用父类的浏览器池初始化（移除自定义实现）
   */
  // initializeBrowser 方法现在使用父类的浏览器池实现

  /**
   * 执行爬取逻辑
   */
  private async executeCrawling(taskConfig: SpiderTaskConfig, taskId: string) {
    // 导航到Twitter List页面
    const listUrl = `https://twitter.com/i/lists/${taskConfig.listId}`;
    console.log(`导航到List页面: ${listUrl}`);

    await this.browserManager!.navigateToUrl(listUrl);

    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 5000));

    let totalNewTweets = 0;
    let totalDuplicates = 0;
    let totalTaskInternalDuplicates = 0;
    let totalSkippedRetweets = 0;
    let totalSkippedReplies = 0;
    let consecutiveDatabaseDuplicates = 0;
    let scrollAttempts = 0;
    let endReason: TaskEndReason = 'TARGET_REACHED';

    // 获取数据库中已有的推文ID
    const existingTweetIds = await this.storageService.getExistingTweetIds(taskConfig.listId);
    const processedTweetIds = new Set<string>();

    // 滚动检测相关变量
    let consecutiveNoScrollCount = 0;
    const maxConsecutiveNoScroll = 3; // 连续3次无滚动效果则终止

    const maxTweets = taskConfig.maxTweets || config.spider.twitterList.maxTweets;
    const maxScrollAttempts = 50; // 防止无限滚动

    console.log(`开始爬取，目标: ${maxTweets} 条推文`);

    while (totalNewTweets < maxTweets && scrollAttempts < maxScrollAttempts) {
      try {
        // 检查任务是否超时
        if (this.isTaskTimedOut()) {
          console.warn('⏰ 任务已超时，终止爬取循环');
          endReason = 'TIMEOUT';
          break;
        }

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

        // 检查连续数据库重复数量
        if (pageResult.duplicateCount > 0) {
          consecutiveDatabaseDuplicates += pageResult.duplicateCount;
        } else {
          consecutiveDatabaseDuplicates = 0;
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

        // 检查当前页面的推文数量
        if (pageResult.totalProcessed === 0 && scrollAttempts > 0) {
          console.log('🏁 当前页面没有找到任何推文，已到达底部');
          endReason = 'NO_MORE_CONTENT';
          break;
        }

        // 获取滚动前的位置
        const beforeScrollPosition = await this.browserManager!.getScrollPosition();

        // 先滚动加载更多内容
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
          consecutiveNoScrollCount = 0;
          console.log(`✅ 有效滚动: ${scrollDistance}px`);
        }

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
   * 重试机制包装器
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
        return await this.executeTask(taskConfig, taskId);

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
   * 重试清理
   */
  private async cleanupForRetry(): Promise<void> {
    try {
      if (this.browserManager) {
        await this.browserManager.close();
        this.browserManager = undefined;
      }
      this.twitterSelector = null;
    } catch (error) {
      console.error('重试清理失败:', error);
      // 强制清除引用
      this.browserManager = undefined;
      this.twitterSelector = null;
    }
  }

  /**
   * 清理方法重写
   */
  protected async cleanup(): Promise<void> {
    await super.cleanup();
    this.twitterSelector = null;
  }
}