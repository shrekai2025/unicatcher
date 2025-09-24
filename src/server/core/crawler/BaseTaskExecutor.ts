/**
 * 基础任务执行器
 * 为不同平台的任务执行器提供统一的基础功能和接口
 */

import { BrowserManager } from '../browser/manager';
import { BrowserPool } from '../browser/BrowserPool';
import { TwitterBrowserPool } from '../browser/TwitterBrowserPool';
import { YouTubeBrowserPool } from '../browser/YouTubeBrowserPool';
import { UnifiedStorageService } from '../data/UnifiedStorageService';
import type { TaskConfig, TaskResult, TaskType } from '~/types/spider';

export abstract class BaseTaskExecutor {
  protected browserManager?: BrowserManager;
  protected storageService: UnifiedStorageService;
  protected isRunning = false;
  protected isDisposed = false;

  // 定时器管理
  private timeoutId: NodeJS.Timeout | null = null;
  private isTimedOut = false;

  constructor() {
    this.storageService = new UnifiedStorageService();
  }

  /**
   * 抽象方法：子类必须实现具体的执行逻辑
   */
  abstract executeTask(config: TaskConfig, taskId: string): Promise<TaskResult>;

  /**
   * 抽象方法：获取任务类型
   */
  protected abstract getTaskType(): TaskType;

  /**
   * 通用方法：初始化浏览器
   */
  protected async initializeBrowser(): Promise<void> {
    const browserPool = this.getBrowserPool(this.getTaskType());
    this.browserManager = await browserPool.getBrowser();
    console.log(`✅ 从浏览器池获取实例: ${this.getTaskType()}`);
  }

  /**
   * 获取对应的浏览器池
   */
  private getBrowserPool(type: TaskType): BrowserPool {
    switch (type) {
      case 'twitter_list':
        return TwitterBrowserPool.getInstance();
      case 'youtube_channel':
        return YouTubeBrowserPool.getInstance();
      default:
        throw new Error(`不支持的任务类型: ${type}`);
    }
  }

  /**
   * 设置任务超时
   */
  protected setTaskTimeout(taskId: string, timeoutMs: number): void {
    this.clearTaskTimeout();

    this.timeoutId = setTimeout(() => {
      if (!this.isDisposed) {
        console.warn(`⏰ 任务超时: ${taskId}`);
        this.isTimedOut = true;
        this.forceCleanupTimeout(taskId);
      }
    }, timeoutMs);
  }

  /**
   * 清理任务超时定时器
   */
  protected clearTaskTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * 强制清理超时任务
   */
  private async forceCleanupTimeout(taskId: string): Promise<void> {
    try {
      console.error(`🚨 强制终止超时任务: ${taskId}`);

      this.isRunning = false;
      this.isTimedOut = true;

      await this.cleanup();

      // 更新任务状态为失败 (使用父类方法，保持兼容性)
      await (this.storageService as any).updateTaskStatus(taskId, 'failed', {
        success: false,
        message: `任务执行超时，已强制终止`,
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
          executionTime: 0,
        },
      });

      console.log(`✅ 超时任务已强制清理: ${taskId}`);
    } catch (error) {
      console.error('强制清理超时任务失败:', error);
    }
  }

  /**
   * 检查任务是否超时
   */
  protected isTaskTimedOut(): boolean {
    return this.isTimedOut;
  }

  /**
   * 取消任务
   */
  async cancelTask(): Promise<void> {
    console.log('正在取消任务...');
    this.isRunning = false;
    await this.cleanup();
    console.log('任务已取消');
  }

  /**
   * 通用清理方法
   */
  protected async cleanup(): Promise<void> {
    if (this.isDisposed) return;

    this.isDisposed = true;
    this.clearTaskTimeout();

    try {
      if (this.browserManager) {
        // 将浏览器归还到对应的浏览器池
        const browserPool = this.getBrowserPool(this.getTaskType());
        await browserPool.returnBrowser(this.browserManager);
        console.log(`🔄 浏览器已归还到池中: ${this.getTaskType()}`);
        this.browserManager = undefined;
      }
    } catch (error) {
      console.error('浏览器归还失败:', error);
      // 如果归还失败，尝试直接关闭
      if (this.browserManager) {
        try {
          await this.browserManager.close();
        } catch (closeError) {
          console.error('浏览器强制关闭失败:', closeError);
        }
        this.browserManager = undefined;
      }
    }

    this.isRunning = false;
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(): {
    isRunning: boolean;
    isTimedOut: boolean;
    isDisposed: boolean;
    browserStatus?: any;
  } {
    const status: any = {
      isRunning: this.isRunning,
      isTimedOut: this.isTimedOut,
      isDisposed: this.isDisposed,
    };

    if (this.browserManager) {
      status.browserStatus = this.browserManager.getStatus();
    }

    return status;
  }
}