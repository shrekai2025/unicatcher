/**
 * Twitter 专用浏览器池
 * 使用 Twitter 优化的配置和状态管理
 */

import { BrowserPool } from './BrowserPool';
import { BrowserManager } from './manager';
import { config } from '~/lib/config';

export class TwitterBrowserPool extends BrowserPool {
  private static instance: TwitterBrowserPool;
  private readonly storageStateFile = 'twitter-browser-state.json';

  private constructor() {
    // Twitter 允许更多并发，因为相对简单
    super(config.spider.maxConcurrentTasks || 3);
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TwitterBrowserPool {
    if (!TwitterBrowserPool.instance) {
      TwitterBrowserPool.instance = new TwitterBrowserPool();
    }
    return TwitterBrowserPool.instance;
  }

  /**
   * 创建 Twitter 专用浏览器配置
   */
  protected async createBrowser(): Promise<BrowserManager> {
    const browserConfig = {
      headless: config.playwright.headless,
      timeout: config.playwright.timeout,
      viewport: config.playwright.viewport,
      userAgent: config.spider.userAgent,
      userDataDir: `${config.playwright.userDataDir}/twitter`,
    };

    console.log('🐦 创建 Twitter 专用浏览器实例');

    const browser = new BrowserManager(browserConfig);
    await browser.launch();

    // Twitter 特定的初始化
    await this.initializeTwitterBrowser(browser);

    return browser;
  }

  /**
   * Twitter 浏览器特定初始化
   */
  private async initializeTwitterBrowser(browser: BrowserManager): Promise<void> {
    try {
      // 可以在这里添加 Twitter 特定的初始化逻辑
      // 比如设置特定的 cookies、localStorage 等
      console.log('🔧 初始化 Twitter 浏览器配置');

      // 设置一些 Twitter 优化的设置
      const page = await browser.getPage();

      // 禁用图片加载以提高性能（可选）
      if (config.spider.twitterList.disableImages) {
        await page.route('**/*.{png,jpg,jpeg,gif,webp}', route => route.abort());
      }

      // 设置 Twitter 特定的用户代理
      await page.setExtraHTTPHeaders({
        'User-Agent': config.spider.userAgent
      });

      console.log('✅ Twitter 浏览器初始化完成');
    } catch (error) {
      console.error('Twitter 浏览器初始化失败:', error);
      // 不抛出错误，让浏览器继续使用
    }
  }

  /**
   * Twitter 专用的健康检查
   */
  async performTwitterHealthCheck(): Promise<{ healthy: number; removed: number; errors: string[] }> {
    console.log('🐦 执行 Twitter 浏览器池健康检查...');

    const errors: string[] = [];
    let removedCount = 0;

    const healthChecks = this.availableBrowsers.map(async (browser, index) => {
      try {
        // 基础健康检查
        const isHealthy = await browser.healthCheck();

        if (isHealthy) {
          // Twitter 特定检查：确保可以访问 Twitter
          try {
            const page = await browser.getPage();
            await page.goto('https://twitter.com', { waitUntil: 'domcontentloaded', timeout: 10000 });
            console.log(`✅ Twitter 浏览器 ${index} 可以正常访问 Twitter`);
          } catch (twitterError) {
            console.warn(`⚠️ Twitter 浏览器 ${index} 无法访问 Twitter:`, twitterError);
            errors.push(`Browser ${index}: Twitter 访问失败`);
            await this.removeBrowserFromPool(browser);
            removedCount++;
          }
        } else {
          console.warn(`⚠️ Twitter 浏览器 ${index} 基础健康检查失败`);
          errors.push(`Browser ${index}: 基础健康检查失败`);
          await this.removeBrowserFromPool(browser);
          removedCount++;
        }
      } catch (error) {
        console.error(`检查 Twitter 浏览器 ${index} 失败:`, error);
        errors.push(`Browser ${index}: 检查失败 - ${error instanceof Error ? error.message : '未知错误'}`);
        await this.removeBrowserFromPool(browser);
        removedCount++;
      }
    });

    await Promise.allSettled(healthChecks);

    const result = {
      healthy: this.browsers.length,
      removed: removedCount,
      errors
    };

    console.log(`✅ Twitter 健康检查完成: 健康 ${result.healthy} 个，移除 ${result.removed} 个`);
    return result;
  }

  /**
   * 获取 Twitter 专用状态
   */
  getTwitterStatus() {
    return {
      ...this.getStatus(),
      platform: 'twitter',
      storageState: this.storageStateFile,
      userAgent: config.spider.userAgent,
    };
  }
}