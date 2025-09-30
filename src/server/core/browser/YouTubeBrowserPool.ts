/**
 * YouTube 专用浏览器池
 * 使用 YouTube 优化的配置和状态管理
 */

import { BrowserPool } from './BrowserPool';
import { BrowserManager } from './manager';
import { config } from '~/lib/config';

export class YouTubeBrowserPool extends BrowserPool {
  private static instance: YouTubeBrowserPool;
  private readonly storageStateFile = 'youtube-browser-state.json';

  private constructor() {
    // YouTube 页面较重，使用较少的并发数
    super(Math.min(config.spider.maxConcurrentTasks || 2, 2));
  }

  /**
   * 获取单例实例
   */
  static getInstance(): YouTubeBrowserPool {
    if (!YouTubeBrowserPool.instance) {
      YouTubeBrowserPool.instance = new YouTubeBrowserPool();
    }
    return YouTubeBrowserPool.instance;
  }

  /**
   * 创建 YouTube 专用浏览器配置
   */
  protected async createBrowser(): Promise<BrowserManager> {
    const browserConfig = {
      headless: config.playwright.headless,
      timeout: config.playwright.timeout * 1.5, // YouTube 页面加载较慢
      viewport: {
        width: 1920,
        height: 1080 // YouTube 需要更大的视窗以正确加载视频列表
      },
      userAgent: config.spider.youtubeChannel.userAgent,
      userDataDir: `${config.playwright.userDataDir}/youtube`,
    };

    console.log('🎥 创建 YouTube 专用浏览器实例');

    const browser = new BrowserManager(browserConfig);
    await browser.launch();

    // YouTube 特定的初始化
    await this.initializeYouTubeBrowser(browser);

    return browser;
  }

  /**
   * YouTube 浏览器特定初始化
   */
  private async initializeYouTubeBrowser(browser: BrowserManager): Promise<void> {
    try {
      console.log('🔧 初始化 YouTube 浏览器配置');

      const page = await browser.getPage();

      // 设置 YouTube 特定的请求头
      await page.setExtraHTTPHeaders({
        'User-Agent': config.spider.youtubeChannel.userAgent,
        'Accept-Language': 'en-US,en;q=0.9', // 统一语言，便于选择器匹配
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      // 禁用不必要的资源以提高性能
      await page.route('**/*.{mp4,webm,avi,mov,flv}', route => route.abort()); // 视频文件
      await page.route('**/ads**', route => route.abort()); // 广告
      await page.route('**/analytics**', route => route.abort()); // 分析脚本

      // 设置 YouTube 偏好
      await page.addInitScript(() => {
        // 禁用自动播放
        Object.defineProperty(HTMLMediaElement.prototype, 'autoplay', {
          set: () => {},
          get: () => false
        });

        // 设置一些 YouTube 相关的 localStorage
        localStorage.setItem('yt-remote-device-id', 'chrome-extension-fake-device-id');
        localStorage.setItem('yt-remote-session-app', 'youtube-html5');
      });

      console.log('✅ YouTube 浏览器初始化完成');
    } catch (error) {
      console.error('YouTube 浏览器初始化失败:', error);
      // 不抛出错误，让浏览器继续使用
    }
  }

  /**
   * YouTube 专用的健康检查
   */
  async performYouTubeHealthCheck(): Promise<{ healthy: number; removed: number; errors: string[] }> {
    console.log('🎥 执行 YouTube 浏览器池健康检查...');

    const errors: string[] = [];
    let removedCount = 0;

    const healthChecks = this.availableBrowsers.map(async (browser, index) => {
      try {
        // 基础健康检查
        const isHealthy = await browser.healthCheck();

        if (isHealthy) {
          // YouTube 特定检查：确保可以访问 YouTube
          try {
            const page = await browser.getPage();
            await page.goto('https://youtube.com', { waitUntil: 'domcontentloaded', timeout: 15000 });

            // 检查是否存在 YouTube 特定元素
            const hasYouTubeElements = await page.evaluate(() => {
              return document.querySelector('ytd-app') !== null ||
                     document.querySelector('#masthead') !== null ||
                     document.title.toLowerCase().includes('youtube');
            });

            if (hasYouTubeElements) {
              console.log(`✅ YouTube 浏览器 ${index} 可以正常访问 YouTube`);
            } else {
              throw new Error('YouTube 页面结构异常');
            }
          } catch (youtubeError) {
            console.warn(`⚠️ YouTube 浏览器 ${index} 无法正常访问 YouTube:`, youtubeError);
            errors.push(`Browser ${index}: YouTube 访问失败`);
            await this.removeBrowserFromPool(browser);
            removedCount++;
          }
        } else {
          console.warn(`⚠️ YouTube 浏览器 ${index} 基础健康检查失败`);
          errors.push(`Browser ${index}: 基础健康检查失败`);
          await this.removeBrowserFromPool(browser);
          removedCount++;
        }
      } catch (error) {
        console.error(`检查 YouTube 浏览器 ${index} 失败:`, error);
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

    console.log(`✅ YouTube 健康检查完成: 健康 ${result.healthy} 个，移除 ${result.removed} 个`);
    return result;
  }

  /**
   * 获取 YouTube 专用状态
   */
  getYouTubeStatus() {
    return {
      ...this.getStatus(),
      platform: 'youtube',
      storageState: this.storageStateFile,
      userAgent: config.spider.youtubeChannel.userAgent,
      optimizedViewport: { width: 1920, height: 1080 },
    };
  }

  /**
   * 预热 YouTube 浏览器（可选优化）
   */
  async warmUp(): Promise<void> {
    console.log('🔥 预热 YouTube 浏览器池...');

    try {
      // 创建一个浏览器实例并访问 YouTube 首页
      const browser = await this.getBrowser();
      const page = await browser.getPage();

      await page.goto('https://youtube.com', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      // 等待页面稳定
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 归还浏览器
      await this.returnBrowser(browser);

      console.log('✅ YouTube 浏览器池预热完成');
    } catch (error) {
      console.warn('⚠️ YouTube 浏览器池预热失败:', error);
    }
  }
}