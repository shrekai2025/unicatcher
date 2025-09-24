/**
 * 统一任务管理器
 * 管理不同类型的爬虫任务执行器
 */

import { BaseTaskExecutor } from './BaseTaskExecutor';
import { TwitterTaskExecutor } from './TwitterTaskExecutor';
import { YouTubeTaskExecutor } from './YouTubeTaskExecutor';
import { UnifiedStorageService } from '../data/UnifiedStorageService';
import type { TaskConfig, TaskType, TwitterTaskConfig, YouTubeTaskConfig } from '~/types/spider';
import { config } from '~/lib/config';

export class UnifiedTaskManager {
  private static instance: UnifiedTaskManager | null = null;
  private executors: Map<string, BaseTaskExecutor> = new Map();
  private runningTasks: Set<string> = new Set();
  private taskCreationLock = false; // 防止并发创建竞态

  private constructor() {}

  static getInstance(): UnifiedTaskManager {
    if (!UnifiedTaskManager.instance) {
      UnifiedTaskManager.instance = new UnifiedTaskManager();
    }
    return UnifiedTaskManager.instance;
  }

  /**
   * 提交统一任务
   */
  async submitTask(config: TaskConfig): Promise<string> {
    // 原子性检查并发限制
    if (this.taskCreationLock) {
      throw new Error('任务创建正在进行中，请稍后重试');
    }

    this.taskCreationLock = true;
    try {
      if (this.runningTasks.size >= this.getMaxConcurrentTasks()) {
        throw new Error(`并发任务数量已达上限: ${this.getMaxConcurrentTasks()}`);
      }

      const storageService = new UnifiedStorageService();
      const realTaskId = await storageService.createUnifiedTask(config);
      const executor = this.createExecutor(config);

      // 原子性添加到运行集合
      this.executors.set(realTaskId, executor);
      this.runningTasks.add(realTaskId);

      // 异步执行
      this.executeTaskAsync(realTaskId, config, executor);
      return realTaskId;
    } finally {
      this.taskCreationLock = false;
    }
  }

  /**
   * 创建对应的执行器
   */
  private createExecutor(config: TaskConfig): BaseTaskExecutor {
    switch (config.type) {
      case 'twitter_list':
        return new TwitterTaskExecutor();
      case 'youtube_channel':
        return new YouTubeTaskExecutor();
      default:
        throw new Error(`不支持的任务类型: ${(config as any).type}`);
    }
  }

  /**
   * 异步执行任务
   */
  private async executeTaskAsync(
    taskId: string,
    taskConfig: TaskConfig,
    executor: BaseTaskExecutor
  ): Promise<void> {
    try {
      const result = config.spider.enableRetry
        ? await this.executeWithRetry(executor, taskConfig, taskId)
        : await executor.executeTask(taskConfig, taskId);

      console.log(`任务完成: ${taskId}`, result);
    } catch (error) {
      console.error(`任务失败: ${taskId}`, error);
    } finally {
      // 确保资源完全清理
      await this.cleanupTask(taskId, executor);
    }
  }

  /**
   * 执行带重试的任务
   */
  private async executeWithRetry(
    executor: BaseTaskExecutor,
    taskConfig: TaskConfig,
    taskId: string
  ) {
    // 如果是 Twitter 执行器，使用其内建的重试机制
    if (executor instanceof TwitterTaskExecutor) {
      // 转换为旧格式以兼容现有的重试逻辑
      if (taskConfig.type === 'twitter_list') {
        const twitterConfig = taskConfig as TwitterTaskConfig;
        const oldConfig = {
          listId: twitterConfig.listId,
          maxTweets: twitterConfig.maxTweets,
          duplicateStopCount: twitterConfig.duplicateStopCount
        };
        return await executor.executeWithRetry(oldConfig, taskId);
      }
    }

    // 默认执行
    return await executor.executeTask(taskConfig, taskId);
  }

  /**
   * 清理任务资源
   */
  private async cleanupTask(taskId: string, executor: BaseTaskExecutor): Promise<void> {
    try {
      // 先尝试正常取消执行器
      await executor.cancelTask();
    } catch (error) {
      console.error(`清理任务执行器失败: ${taskId}`, error);
    } finally {
      // 无论如何都要清理引用
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
      await this.cleanupTask(taskId, executor);
      console.log(`任务已取消: ${taskId}`);
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string) {
    const executor = this.executors.get(taskId);
    return executor ? executor.getTaskStatus() : null;
  }

  /**
   * 获取所有任务状态
   */
  getStatus() {
    return {
      runningTasks: this.runningTasks.size,
      maxConcurrentTasks: this.getMaxConcurrentTasks(),
      executors: Array.from(this.executors.keys()),
    };
  }

  /**
   * 获取最大并发任务数
   */
  private getMaxConcurrentTasks(): number {
    return config.spider.maxConcurrentTasks;
  }

  /**
   * 强制清理僵尸任务
   */
  async forceCleanupZombieTasks(): Promise<{ total: number; cleaned: string[] }> {
    const zombieTaskIds: string[] = [];
    const cleanupPromises: Promise<void>[] = [];

    for (const [taskId, executor] of this.executors.entries()) {
      try {
        const status = executor.getTaskStatus();
        // 如果执行器显示已停止但仍在管理器中，认为是僵尸任务
        if (!status.isRunning && !status.isDisposed) {
          zombieTaskIds.push(taskId);
          cleanupPromises.push(this.cleanupTask(taskId, executor));
        }
      } catch (error) {
        // 如果获取状态失败，也认为是僵尸任务
        zombieTaskIds.push(taskId);
        cleanupPromises.push(this.cleanupTask(taskId, executor));
      }
    }

    // 并行清理所有僵尸任务
    await Promise.allSettled(cleanupPromises);

    console.log(`清理了 ${zombieTaskIds.length} 个僵尸任务:`, zombieTaskIds);

    return {
      total: zombieTaskIds.length,
      cleaned: zombieTaskIds,
    };
  }

  // ================ 向后兼容性方法 ================

  /**
   * 向后兼容：提交旧格式的 Twitter 任务
   */
  async submitTwitterTask(taskConfig: any): Promise<string> {
    // 转换为新格式
    const newConfig: TwitterTaskConfig = {
      type: 'twitter_list',
      listId: taskConfig.listId,
      maxTweets: taskConfig.maxTweets,
      duplicateStopCount: taskConfig.duplicateStopCount
    };

    return this.submitTask(newConfig);
  }

  /**
   * 提交 YouTube 任务
   */
  async submitYouTubeTask(taskConfig: any): Promise<string> {
    // 转换为新格式
    const newConfig: YouTubeTaskConfig = {
      type: 'youtube_channel',
      usernames: Array.isArray(taskConfig.channelHandles)
        ? taskConfig.channelHandles
        : [taskConfig.channelHandle], // 支持单个或多个频道
      maxVideosPerChannel: taskConfig.maxVideos || taskConfig.maxVideosPerChannel,
      duplicateStopCount: taskConfig.duplicateStopCount
    };

    return this.submitTask(newConfig);
  }
}