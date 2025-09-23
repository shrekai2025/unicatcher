/**
 * 推文更新器
 * 负责爬取单个推文的最新社交数据并更新到数据库
 */

import { BrowserManager } from '../../browser/manager';
import { TweetDetailSelectors } from './selectors';
import type {
  SocialMetrics,
  TweetUpdateResult,
  ProcessorBrowserConfig,
  ErrorCode
} from '../types';
import { config } from '~/lib/config';

export class TweetUpdater {
  private browserManager: BrowserManager | null = null;
  private selectors: TweetDetailSelectors | null = null;
  private isHealthy = true;

  private readonly browserConfig: ProcessorBrowserConfig = {
    headless: config.playwright.headless,
    timeout: config.playwright.timeout,
    viewport: config.playwright.viewport,
    userAgent: config.spider.userAgent,
  };

  /**
   * 初始化浏览器和选择器
   */
  private async initializeBrowser(): Promise<void> {
    try {
      console.log('初始化推文更新器浏览器...');

      this.browserManager = await BrowserManager.create(this.browserConfig);

      // 健康检查
      const isHealthy = await this.browserManager.healthCheck();
      if (!isHealthy) {
        throw new Error('浏览器健康检查失败');
      }

      // 创建选择器
      const page = await this.browserManager.getPage();
      this.selectors = new TweetDetailSelectors(page);

      console.log('推文更新器浏览器初始化完成');
      this.isHealthy = true;

    } catch (error) {
      console.error('初始化浏览器失败:', error);
      this.isHealthy = false;
      await this.cleanup();
      throw new Error(`浏览器初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 更新推文的社交数据
   */
  async updateTweetData(tweetId: string, existingData: SocialMetrics): Promise<TweetUpdateResult> {
    try {
      console.log(`开始更新推文 ${tweetId} 的社交数据`);

      // 初始化浏览器
      await this.initializeBrowser();

      if (!this.browserManager || !this.selectors) {
        throw new Error('浏览器或选择器未初始化');
      }

      // 构建推文URL
      const tweetUrl = `https://x.com/i/status/${tweetId}`;
      console.log(`导航到推文页面: ${tweetUrl}`);

      // 导航到推文详情页
      await this.browserManager.navigateToUrl(tweetUrl);

      // 等待页面加载
      await this.selectors.waitForTweetDetail();

      // 验证推文ID是否正确
      const isValidTweet = await this.selectors.validateTweetId(tweetId);
      if (!isValidTweet) {
        throw this.createError('TWEET_NOT_FOUND', `推文 ${tweetId} 验证失败，可能已被删除或无法访问`);
      }

      // 提取最新的社交数据
      const newData = await this.selectors.extractSocialMetrics();

      // 比较数据变化
      const hasChanges = this.detectChanges(existingData, newData);

      const result: TweetUpdateResult = {
        success: true,
        message: hasChanges ? '推文社交数据已更新' : '推文社交数据无变化',
        data: {
          tweetId,
          oldData: existingData,
          newData,
          hasChanges,
          lastUpdatedAt: this.formatDateTime(new Date()),
        },
      };

      console.log(`推文 ${tweetId} 更新完成:`, {
        hasChanges,
        oldData: existingData,
        newData,
      });

      return result;

    } catch (error) {
      console.error(`更新推文 ${tweetId} 失败:`, error);

      // 检查是否是已知的错误类型
      if (this.isKnownError(error)) {
        throw error;
      }

      // 包装为通用错误
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw this.createError('BROWSER_ERROR', `更新推文数据失败: ${errorMessage}`);

    } finally {
      // 清理资源
      await this.cleanup();
    }
  }

  /**
   * 检测数据变化
   */
  private detectChanges(oldData: SocialMetrics, newData: SocialMetrics): boolean {
    return (
      oldData.replyCount !== newData.replyCount ||
      oldData.retweetCount !== newData.retweetCount ||
      oldData.likeCount !== newData.likeCount ||
      oldData.viewCount !== newData.viewCount
    );
  }

  /**
   * 检查是否为已知错误类型
   */
  private isKnownError(error: any): boolean {
    return error && typeof error === 'object' && 'code' in error;
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
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.browserManager) {
        await this.browserManager.close();
        this.browserManager = null;
      }
      this.selectors = null;
      console.log('推文更新器资源清理完成');
    } catch (error) {
      console.error('清理推文更新器资源失败:', error);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    if (!this.browserManager) {
      return false;
    }

    try {
      const isHealthy = await this.browserManager.healthCheck();
      this.isHealthy = isHealthy;
      return isHealthy;
    } catch (error) {
      console.error('推文更新器健康检查失败:', error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * 获取状态
   */
  getStatus(): {
    isHealthy: boolean;
    hasBrowser: boolean;
    hasSelectors: boolean;
  } {
    return {
      isHealthy: this.isHealthy,
      hasBrowser: !!this.browserManager,
      hasSelectors: !!this.selectors,
    };
  }

  /**
   * 强制终止
   */
  async forceTerminate(): Promise<void> {
    console.log('强制终止推文更新器...');
    this.isHealthy = false;
    await this.cleanup();
  }
}