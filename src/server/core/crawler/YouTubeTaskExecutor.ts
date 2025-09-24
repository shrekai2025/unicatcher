/**
 * YouTube 任务执行器
 * 专门处理 YouTube 频道爬取任务
 */

import { BaseTaskExecutor } from './BaseTaskExecutor';
import { BrowserManager } from '../browser/manager';
import { YouTubeSelector } from '../spider/selectors/youtube';
import type {
  TaskConfig,
  TaskResult,
  TaskType,
  YouTubeTaskConfig,
  YouTubeChannelConfig,
  TaskEndReason,
  YouTubeVideoData
} from '~/types/spider';
import { config } from '~/lib/config';

export class YouTubeTaskExecutor extends BaseTaskExecutor {
  private youtubeSelector: YouTubeSelector | null = null;

  // 性能优化：智能健康检查
  private healthCheckCounter = 0;
  private readonly healthCheckInterval = 3; // 每3次滚动检查一次（YouTube页面更重）

  /**
   * 获取任务类型
   */
  protected getTaskType(): TaskType {
    return 'youtube_channel';
  }

  /**
   * 执行 YouTube 任务
   */
  async executeTask(config: TaskConfig, taskId: string): Promise<TaskResult>;
  async executeTask(config: YouTubeChannelConfig, taskId?: string): Promise<TaskResult>;
  async executeTask(configOrTaskConfig: any, taskIdOrUndefined?: string): Promise<TaskResult> {
    const startTime = Date.now();

    // 兼容性处理：支持新旧两种调用方式
    let taskConfig: YouTubeChannelConfig;
    let actualTaskId: string;

    if ('type' in configOrTaskConfig) {
      // 新的 TaskConfig 格式
      const youtubeConfig = configOrTaskConfig as YouTubeTaskConfig;
      // 目前只支持单个频道，取第一个用户名
      taskConfig = {
        channelHandle: youtubeConfig.usernames[0] || '',
        maxVideos: youtubeConfig.maxVideosPerChannel,
        duplicateStopCount: youtubeConfig.duplicateStopCount
      };
      actualTaskId = taskIdOrUndefined || '';
    } else {
      // 旧的 YouTubeChannelConfig 格式
      taskConfig = configOrTaskConfig;
      actualTaskId = taskIdOrUndefined || '';
    }

    try {
      console.log(`开始执行YouTube频道爬取任务: ${taskConfig.channelHandle}`);

      // 如果没有传入taskId，则创建新的任务记录（兼容直接调用的情况）
      if (!actualTaskId) {
        actualTaskId = await this.storageService.createUnifiedTask({
          type: 'youtube_channel',
          usernames: [taskConfig.channelHandle],
          maxVideosPerChannel: taskConfig.maxVideos,
          duplicateStopCount: taskConfig.duplicateStopCount
        });
      }

      await this.storageService.updateTaskStatus(actualTaskId, 'running');

      this.isRunning = true;

      // 🔧 设置任务超时机制（YouTube任务时间更长）
      this.setTaskTimeout(actualTaskId, config.spider.taskTimeout * 1.5);

      // 初始化浏览器和选择器
      await this.initializeBrowser();

      const page = await this.browserManager!.getPage();
      this.youtubeSelector = new YouTubeSelector(page);

      // 开始爬取
      const result = await this.executeCrawling(taskConfig, actualTaskId);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log(`✅ YouTube任务完成: ${actualTaskId}`, result);

      // 更新任务状态为完成
      await this.storageService.updateTaskStatus(actualTaskId, 'completed', {
        success: true,
        message: `YouTube频道爬取完成，获得 ${result.totalNewVideos} 个新视频`,
        endReason: result.endReason,
        data: {
          videoCount: result.totalNewVideos,
          duplicateCount: result.totalDuplicates,
          executionTime,
        },
      });

      return {
        success: true,
        message: `YouTube频道爬取完成，共获得 ${result.totalNewVideos} 个新视频`,
        endReason: result.endReason,
        data: {
          videoCount: result.totalNewVideos,
          duplicateCount: result.totalDuplicates,
          executionTime,
        },
      };
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.error(`❌ YouTube任务失败: ${actualTaskId}`, error);

      // 更新任务状态为失败
      await this.storageService.updateTaskStatus(actualTaskId, 'failed', {
        success: false,
        message: `YouTube频道爬取失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : '未知错误',
          stack: error instanceof Error ? error.stack : undefined,
        },
        data: {
          videoCount: 0,
          duplicateCount: 0,
          executionTime,
        },
      });

      return {
        success: false,
        message: `YouTube频道爬取失败: ${error instanceof Error ? error.message : '未知错误'}`,
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
   * 执行爬取逻辑
   */
  private async executeCrawling(taskConfig: YouTubeChannelConfig, taskId: string) {
    // 导航到YouTube频道视频页面
    console.log(`导航到YouTube频道: ${taskConfig.channelHandle}`);

    const navigateSuccess = await this.youtubeSelector!.navigateToChannelVideos(taskConfig.channelHandle);
    if (!navigateSuccess) {
      throw new Error(`无法导航到YouTube频道: ${taskConfig.channelHandle}`);
    }

    let totalNewVideos = 0;
    let totalDuplicates = 0;
    let totalTaskInternalDuplicates = 0;
    let consecutiveDatabaseDuplicates = 0;
    let scrollAttempts = 0;
    let endReason: TaskEndReason = 'TARGET_REACHED';

    // 获取数据库中已有的视频ID
    const existingVideoIds = await this.storageService.getExistingYouTubeVideoIds(taskConfig.channelHandle);
    const processedVideoIds = new Set<string>();

    // 滚动检测相关变量
    let consecutiveNoScrollCount = 0;
    let consecutiveNoNewContent = 0;
    const maxConsecutiveNoScroll = 3; // 连续3次无滚动效果则终止
    const maxConsecutiveNoNewContent = 2; // 连续2次无新内容则终止

    const maxVideos = taskConfig.maxVideos || config.spider.youtubeChannel.maxVideosPerChannel;
    const maxScrollAttempts = 20; // YouTube页面滚动次数较少

    console.log(`开始爬取，目标: ${maxVideos} 个视频`);

    while (totalNewVideos < maxVideos && scrollAttempts < maxScrollAttempts) {
      try {
        // 检查任务是否超时
        if (this.isTaskTimedOut()) {
          console.warn('⏰ YouTube任务已超时，终止爬取循环');
          endReason = 'TIMEOUT';
          break;
        }

        // 添加随机延迟
        await this.addRandomDelay();

        // 处理当前页面的视频
        const pageResult = await this.youtubeSelector!.processChannelPage(
          taskConfig.channelHandle,
          existingVideoIds,
          processedVideoIds
        );

        // 保存新视频
        if (pageResult.newVideos.length > 0) {
          await this.storageService.saveYouTubeVideos(pageResult.newVideos, taskId);
          totalNewVideos += pageResult.newVideos.length;

          // 更新任务视频计数
          await this.storageService.updateTaskVideoCount(taskId, totalNewVideos);

          console.log(`已保存 ${pageResult.newVideos.length} 个新视频，总计: ${totalNewVideos}`);
          consecutiveNoNewContent = 0; // 重置无新内容计数
        } else {
          consecutiveNoNewContent++;
          console.log(`本次无新视频，连续无新内容次数: ${consecutiveNoNewContent}`);
        }

        totalDuplicates += pageResult.duplicateCount;
        totalTaskInternalDuplicates += pageResult.taskInternalDuplicates;

        // 检查连续数据库重复数量
        if (pageResult.duplicateCount > 0) {
          consecutiveDatabaseDuplicates += pageResult.duplicateCount;
        } else {
          consecutiveDatabaseDuplicates = 0;
        }

        // 停止条件检查
        if (totalNewVideos >= maxVideos) {
          console.log(`✅ 已达到最大视频数量: ${maxVideos}`);
          endReason = 'TARGET_REACHED';
          break;
        }

        if (consecutiveDatabaseDuplicates >= config.spider.youtubeChannel.duplicateStopCount) {
          console.log(`⚠️ 连续遇到 ${consecutiveDatabaseDuplicates} 个数据库重复视频，停止爬取`);
          endReason = 'CONSECUTIVE_DUPLICATES';
          break;
        }

        if (consecutiveNoNewContent >= maxConsecutiveNoNewContent) {
          console.log(`⚠️ 连续 ${maxConsecutiveNoNewContent} 次无新内容，可能已到底部`);
          endReason = 'NO_MORE_CONTENT';
          break;
        }

        // 检查当前页面的视频数量
        if (pageResult.totalProcessed === 0 && scrollAttempts > 0) {
          console.log('🏁 当前页面没有找到任何视频，已到达底部');
          endReason = 'NO_MORE_CONTENT';
          break;
        }

        // 滚动加载更多内容
        console.log('📜 滚动加载更多视频...');
        const hasNewContent = await this.youtubeSelector!.scrollForMoreVideos();
        scrollAttempts++;

        if (!hasNewContent) {
          consecutiveNoScrollCount++;
          console.log(`⚠️ 滚动无效果，连续无效滚动: ${consecutiveNoScrollCount}/${maxConsecutiveNoScroll}`);

          if (consecutiveNoScrollCount >= maxConsecutiveNoScroll) {
            console.log(`🏁 连续 ${maxConsecutiveNoScroll} 次无效滚动，页面无法继续滚动`);
            endReason = 'NO_MORE_CONTENT';
            break;
          }
        } else {
          consecutiveNoScrollCount = 0;
          console.log('✅ 有效滚动，加载了新内容');
        }

        // 智能等待：根据获取到的内容调整延迟
        const waitTime = pageResult.newVideos.length > 0
          ? config.spider.youtubeChannel.waitTime
          : config.spider.youtubeChannel.waitTime * 1.5; // 无新内容时延长等待

        console.log(`⏰ 智能等待: ${waitTime}ms (新视频: ${pageResult.newVideos.length} 个)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));

        console.log(`📊 滚动次数: ${scrollAttempts}, 新视频: ${totalNewVideos}, 数据库重复: ${totalDuplicates}, 任务内重复: ${pageResult.taskInternalDuplicates}`);

      } catch (error) {
        console.error('处理YouTube页面时出错:', error);

        // 智能健康检查：不是每次都检查
        this.healthCheckCounter++;
        if (this.healthCheckCounter >= this.healthCheckInterval) {
          console.log('🔍 执行YouTube浏览器健康检查...');
          const isHealthy = await this.browserManager!.healthCheck();
          if (!isHealthy) {
            endReason = 'ERROR_OCCURRED';
            throw new Error('YouTube浏览器不健康，无法继续爬取');
          }
          this.healthCheckCounter = 0; // 重置计数器
        }

        // 继续下一次循环
        scrollAttempts++;
      }
    }

    // 输出任务结束原因
    const endReasonMessages = {
      'TARGET_REACHED': '✅ 已达到目标视频数量',
      'CONSECUTIVE_DUPLICATES': '⚠️ 连续重复视频过多，停止爬取',
      'MAX_SCROLL_REACHED': '⏰ 达到最大滚动次数',
      'NO_MORE_CONTENT': '🏁 频道底部，无更多内容',
      'ERROR_OCCURRED': '❌ 发生错误',
      'USER_CANCELLED': '🛑 用户取消',
      'TIMEOUT': '⌛ 任务超时'
    };

    console.log(`📋 YouTube任务结束原因: ${endReasonMessages[endReason]}`);
    console.log(`📊 YouTube爬取完成统计 - 新视频: ${totalNewVideos}, 数据库重复: ${totalDuplicates}, 任务内重复: ${totalTaskInternalDuplicates}`);

    return {
      totalNewVideos,
      totalDuplicates,
      totalTaskInternalDuplicates,
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
  async executeWithRetry(taskConfig: YouTubeChannelConfig, taskId?: string): Promise<TaskResult> {
    const maxRetries = config.spider.retryAttempts;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // 每次重试前检查是否已被取消
        if (this.isDisposed) {
          throw new Error('YouTube任务已被取消');
        }

        console.log(`YouTube执行尝试 ${attempt}/${maxRetries + 1}`);
        return await this.executeTask(taskConfig, taskId);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('未知错误');
        console.error(`YouTube执行尝试 ${attempt} 失败:`, lastError.message);

        // 清理本次尝试的资源
        await this.cleanupForRetry();

        if (attempt <= maxRetries) {
          // 智能重试延迟：指数退避
          const retryDelay = Math.min(
            config.spider.retryDelay * Math.pow(2, attempt - 1),
            60000 // YouTube重试最大60秒
          );
          console.log(`${retryDelay}ms 后重试YouTube任务...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw lastError || new Error('YouTube重试次数耗尽');
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
      this.youtubeSelector = null;
    } catch (error) {
      console.error('YouTube重试清理失败:', error);
      // 强制清除引用
      this.browserManager = undefined;
      this.youtubeSelector = null;
    }
  }

  /**
   * 清理方法重写
   */
  protected async cleanup(): Promise<void> {
    await super.cleanup();
    this.youtubeSelector = null;
  }
}